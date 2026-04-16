from dotenv import load_dotenv

from livekit import agents, rtc
from livekit.agents import AgentServer, AgentSession, Agent, room_io
from livekit.plugins import (
    google,
    noise_cancellation,
)
from prompts import INTERVIEW_PROMPTS
from livekit.plugins import tavus, bey
from livekit.plugins import artalk
import os
import json
import asyncio
import inspect

# ── Monkey-patch: bridge version mismatch between livekit-agents and livekit-plugins-google ──
# livekit-plugins-google may pass `per_response_tool_choice` to RealtimeCapabilities,
# but older livekit-agents versions don't accept it yet. This patch makes the
# constructor silently accept (and ignore) any unknown keyword arguments.
from livekit.agents import llm as _llm
_original_rc_init = _llm.RealtimeCapabilities.__init__
_rc_sig = inspect.signature(_original_rc_init)
if "per_response_tool_choice" not in _rc_sig.parameters:
    def _patched_rc_init(self, *args, **kwargs):
        kwargs.pop("per_response_tool_choice", None)
        return _original_rc_init(self, *args, **kwargs)
    _llm.RealtimeCapabilities.__init__ = _patched_rc_init
# ── End monkey-patch ──────────────────────────────────────────────────────────

load_dotenv(".env")

class Assistant(Agent):
    def __init__(self, interview_type="default") -> None:
        instructions = INTERVIEW_PROMPTS.get(interview_type, INTERVIEW_PROMPTS["default"])
        super().__init__(instructions=instructions)

server = AgentServer()

@server.rtc_session()
async def my_agent(ctx: agents.JobContext):
    gemini_model = google.realtime.RealtimeModel(
        voice="Puck",
        model="gemini-2.5-flash-preview-native-audio-dialog"
    )

    session = AgentSession(
        llm=gemini_model
    )
    
    # Track conversation for phase scoring
    conversation_history = []
    current_phase = "introduction"
    
    # Store document content for scoring
    resume_content = ""
    github_content = ""
    
    @session.on("conversation_item_added")
    def on_item_added(event: agents.ConversationItemAddedEvent):
        nonlocal conversation_history, current_phase
        item = event.item
        if item.type == "message":
            if item.role == "assistant" and item.text_content:
                print(f"Agent: {item.text_content}")
                conversation_history.append({
                    "role": "agent",
                    "content": item.text_content,
                    "phase": current_phase
                })
            elif item.role == "user" and item.text_content:
                print(f"User: {item.text_content}")
                conversation_history.append({
                    "role": "user", 
                    "content": item.text_content,
                    "phase": current_phase
                })

    
    room_name = ctx.room.name
    print(f"[AGENT] Connected to room: {room_name}")
    
   
    if "-interview" in room_name:
        # Extract type from "fullstack-interview-abc123" -> "fullstack"
        interview_type = room_name.split("-interview")[0]
        print(f"[AGENT] Extracted interview type from room name: {interview_type}")
    else:
        interview_type = "default"
        print(f"[AGENT] Could not extract type from room name, using default")
    
 
    if interview_type not in INTERVIEW_PROMPTS:
        print(f"[AGENT] Interview type '{interview_type}' not found in prompts, falling back to default")
        interview_type = "default"
    
    print(f"[AGENT] Final interview type: {interview_type}")
    

    assistant = Assistant(interview_type=interview_type)

   
    # ── Avatar Cascade: Tavus → Beyond Presence → ARTalk ──────────────
    avatar_started = False

    # ── LEVEL 1: Tavus (Primary — Cloud API) ─────────────────────────
    tavus_api_key = os.environ.get("TAVUS_API_KEY", "").strip()
    if tavus_api_key and tavus_api_key != "your_tavus_api_key":
        try:
            print("[AGENT] Attempting to start Tavus avatar...")
            avatar = tavus.AvatarSession(
                replica_id=os.environ.get("REPLICA_ID"),
                persona_id=os.environ.get("PERSONA_ID"),
                api_key=tavus_api_key,
            )
            await avatar.start(session, room=ctx.room)
            print("[AGENT] ✅ Tavus avatar started successfully.")
            avatar_started = True
        except Exception as e:
            print(f"[AGENT] ❌ Tavus failed to start: {e}")
    else:
        print("[AGENT] ⏭️ Tavus credentials not configured, skipping.")

    # ── LEVEL 2: Beyond Presence (Fallback 1 — Cloud API) ────────────
    if not avatar_started:
        bey_api_key = os.environ.get("BEY_API_KEY", "").strip()
        if bey_api_key:
            try:
                print("[AGENT] Attempting Beyond Presence fallback...")
                gemini_model.voice = "Puck"
                bey_avatar = bey.AvatarSession(
                    api_key=bey_api_key,
                    avatar_id=os.environ.get("BEY_AVATAR_ID"),
                )
                await bey_avatar.start(session, room=ctx.room)
                print("[AGENT] ✅ Beyond Presence avatar started (Fallback 1).")
                avatar_started = True
            except Exception as bey_error:
                print(f"[AGENT] ❌ Beyond Presence failed: {bey_error}")
        else:
            print("[AGENT] ⏭️ Beyond Presence credentials not configured, skipping.")

    # ── LEVEL 3: ARTalk (Fallback 2 — Self-hosted GPU) ───────────────
    if not avatar_started:
        artalk_server_url = os.environ.get("ARTALK_SERVER_URL", "").strip()
        if artalk_server_url:
            try:
                print("[AGENT] Attempting ARTalk fallback...")
                artalk_replica_id = os.environ.get("ARTALK_REPLICA_ID", "mesh")
                artalk_avatar = artalk.AvatarSession(
                    replica_id=artalk_replica_id,
                    api_url=artalk_server_url,
                )
                await artalk_avatar.start(
                    agent_session=session,
                    room=ctx.room,
                )
                print("[AGENT] ✅ ARTalk avatar started (Fallback 2).")
                avatar_started = True
            except Exception as artalk_error:
                print(f"[AGENT] ❌ ARTalk also failed: {artalk_error}")
        else:
            print("[AGENT] ⏭️ ARTalk server URL not configured, skipping.")

    if not avatar_started:
        print("[AGENT] ⚠️ No avatar provider available. Agent will run in AUDIO-ONLY mode.")

    print(f"[AGENT] Starting session with interview type: {interview_type}")
    
    await session.start(
        room=ctx.room,
        agent=assistant,
        room_options=room_io.RoomOptions(
            audio_input=room_io.AudioInputOptions(
                noise_cancellation=lambda params: noise_cancellation.BVCTelephony() if params.participant.kind == rtc.ParticipantKind.PARTICIPANT_KIND_SIP else noise_cancellation.BVC(),
            ),
        ),
    )
    
    # Data listener for receiving resume/GitHub data from frontend
    @ctx.room.on("data_received")
    def on_data_received(data: rtc.DataPacket):
        try:
            payload = json.loads(data.data.decode("utf-8"))
            data_type = payload.get("type", "")
            content = payload.get("content", "")
            
            print(f"[AGENT] Received data: type={data_type}, length={len(content)}")
            
            if data_type == "RESUME_DATA":
                print(f"[AGENT] Processing resume data...")
                
                # Store resume content for scoring later
                nonlocal resume_content
                resume_content = content
                
                # Inject resume context into the session
                session.generate_reply(
                    instructions=f"""The candidate has shared their resume. Here is the content:

--- RESUME START ---
{content}
--- RESUME END ---

Acknowledge that you received their resume and ask a specific question about something mentioned in it (a technology, project, or experience). Be specific - reference actual content from the resume."""
                )
                
            elif data_type == "GITHUB_DATA":
                print(f"[AGENT] Processing GitHub data...")
                
                # Store github content for scoring later
                nonlocal github_content
                github_content = content
                
                # Inject GitHub context into the session
                session.generate_reply(
                    instructions=f"""The candidate has shared their GitHub profile. Here is the summary:

--- GITHUB PROFILE ---
{content}
--- GITHUB END ---

Acknowledge that you reviewed their GitHub and ask about a specific repository or project mentioned. Be specific - reference actual repos or technologies from the data."""
                )
            
            elif data_type == "CODE_ANALYSIS":
                # Use Gemini to analyze the submitted code
                code = payload.get("code", "")
                question = payload.get("question", {})
                question_title = question.get("title", "Coding Problem")
                question_desc = question.get("description", "")
                
                print(f"[AGENT] Analyzing code with AI for: {question_title}")
                
                # Define async helper for code analysis
                async def perform_code_analysis():
                    analysis_prompt = f"""You are a code reviewer. Analyze this code submission and return a JSON response.

QUESTION: {question_title}
DESCRIPTION: {question_desc}

SUBMITTED CODE:
```
{code}
```

Analyze the code and return ONLY a valid JSON object (no markdown, no explanation) with this structure:
{{
    "overallScore": <0-100>,
    "verdict": "<Excellent/Good/Needs Work/Incomplete/Failed>",
    "summary": "<2 sentence summary of the submission>",
    "logic": {{"score": <0-100>, "feedback": "<1 sentence>"}},
    "edgeCases": {{"score": <0-100>, "feedback": "<1 sentence>"}},
    "efficiency": {{"score": <0-100>, "feedback": "<1 sentence>"}},
    "readability": {{"score": <0-100>, "feedback": "<1 sentence>"}},
    "suggestions": ["<suggestion 1>", "<suggestion 2>"]
}}

SCORING RULES:
- Empty/unchanged code = 0 score
- No return statement = max 20 score  
- Code that doesn't solve the problem = max 30 score
- Partial solution = 30-60 score
- Working solution with issues = 60-80 score
- Good solution = 80-100 score

Return ONLY the JSON, nothing else."""

                    try:
                        import google.generativeai as genai
                        genai.configure(api_key=os.environ.get("GOOGLE_API_KEY"))
                        model = genai.GenerativeModel('gemini-2.5-flash')
                        response = model.generate_content(analysis_prompt)
                        
                        # Parse the JSON response
                        response_text = response.text.strip()
                        # Remove markdown code blocks if present
                        if response_text.startswith("```"):
                            response_text = response_text.split("```")[1]
                            if response_text.startswith("json"):
                                response_text = response_text[4:]
                        response_text = response_text.strip()
                        
                        analysis_result = json.loads(response_text)
                        print(f"[AGENT] AI Analysis complete. Score: {analysis_result.get('overallScore', 0)}")
                        
                        # Send result back to frontend
                        await ctx.room.local_participant.publish_data(
                            json.dumps({
                                "type": "CODE_ANALYSIS_RESULT",
                                "result": analysis_result
                            }).encode(),
                            reliable=True
                        )
                    except Exception as e:
                        print(f"[AGENT] Code analysis error: {e}")
                        # Send fallback result
                        await ctx.room.local_participant.publish_data(
                            json.dumps({
                                "type": "CODE_ANALYSIS_RESULT",
                                "result": {
                                    "overallScore": 0,
                                    "verdict": "Analysis Error",
                                    "summary": "Unable to analyze code. Please try again.",
                                    "logic": {"score": 0, "feedback": "Error during analysis"},
                                    "edgeCases": {"score": 0, "feedback": "Error during analysis"},
                                    "efficiency": {"score": 0, "feedback": "Error during analysis"},
                                    "readability": {"score": 0, "feedback": "Error during analysis"},
                                    "suggestions": ["Check your code and try again"]
                                }
                            }).encode(),
                            reliable=True
                        )
                
                # Execute the async helper
                asyncio.create_task(perform_code_analysis())
            
            elif data_type == "CODE_FEEDBACK":
                print(f"[AGENT] Speaking code feedback to candidate...")
                feedback_data = payload.get("feedback", {})
                score = feedback_data.get("score", 0)
                verdict = feedback_data.get("verdict", "Unknown")
                summary = feedback_data.get("summary", "")
                suggestions = feedback_data.get("suggestions", [])
                
                # Build the feedback speech
                suggestions_text = ""
                if suggestions:
                    suggestions_text = "Here are my suggestions for improvement: " + ". ".join(suggestions[:3])
                
                session.generate_reply(
                    instructions=f"""You just reviewed the candidate's code submission. Speak naturally as if you're giving verbal feedback.

CODE EVALUATION RESULTS:
- Overall Score: {score} out of 100
- Verdict: {verdict}
- Summary: {summary}
{f'- Suggestions: {suggestions_text}' if suggestions_text else ''}

INSTRUCTIONS FOR YOUR RESPONSE:
1. Start by acknowledging their submission
2. Tell them their score and verdict in a conversational way
3. Explain the main feedback points briefly (don't read word for word, paraphrase naturally)
4. If score is low (below 30), be encouraging but honest about what needs work
5. If score is medium (30-70), highlight what they did well and what to improve
6. If score is high (70+), congratulate them warmly
7. End by saying they can now view their final report - this concludes the coding portion
8. Keep your response under 20 seconds of speaking time - be concise!"""
                )
            
            elif data_type == "PHASE_CHANGE":
                nonlocal current_phase
                new_phase = payload.get("phase", "")
                questions_required = payload.get("questionsRequired", 0)
                previous_phase = current_phase
                
                print(f"[AGENT] Phase changing from {previous_phase} to {new_phase}")
                
                # Score the previous phase based on conversation
                async def score_previous_phase():
                    if previous_phase in ["resume", "github", "topic"]:
                        # Get conversation from the previous phase
                        phase_conversation = [msg for msg in conversation_history if msg["phase"] == previous_phase]
                        
                        if not phase_conversation:
                            print(f"[AGENT] No conversation found for {previous_phase}, using default score")
                            score = 60
                        else:
                            # Build transcript for AI evaluation
                            transcript = "\n".join([f"{msg['role'].upper()}: {msg['content']}" for msg in phase_conversation])
                            
                            try:
                                import google.generativeai as genai
                                genai.configure(api_key=os.environ.get("GOOGLE_API_KEY"))
                                model = genai.GenerativeModel('gemini-2.5-flash')
                                
                                phase_descriptions = {
                                    "resume": "evaluating how well the candidate explained their work experience, projects, and skills from their resume",
                                    "github": "evaluating how well the candidate explained their GitHub projects, technical decisions, and coding contributions",
                                    "topic": "evaluating the candidate's technical knowledge and depth of understanding on interview topics"
                                }
                                
                                scoring_prompt = f"""Evaluate this interview conversation for the {previous_phase.upper()} phase.

PHASE DESCRIPTION: {phase_descriptions.get(previous_phase, 'general interview questions')}

CONVERSATION TRANSCRIPT:
{transcript}

Score the candidate from 0-100 based on:
- Clarity and depth of explanations (40%)
- Technical accuracy and knowledge (30%)
- Communication skills (20%)
- Engagement and enthusiasm (10%)

Return ONLY this JSON (no markdown, no explanation):
{{"score": <0-100>}}"""

                                response = model.generate_content(scoring_prompt)
                                response_text = response.text.strip()
                                if response_text.startswith("```"):
                                    response_text = response_text.split("```")[1]
                                    if response_text.startswith("json"):
                                        response_text = response_text[4:]
                                response_text = response_text.strip()
                                
                                result = json.loads(response_text)
                                score = result.get("score", 70)
                                print(f"[AGENT] {previous_phase} phase scored: {score}")
                                
                            except Exception as e:
                                print(f"[AGENT] Phase scoring error for {previous_phase}: {e}")
                                score = 70  # Default score on error
                        
                        # Send score to frontend
                        await ctx.room.local_participant.publish_data(
                            json.dumps({
                                "type": "PHASE_SCORE",
                                "phase": previous_phase,
                                "score": score
                            }).encode(),
                            reliable=True
                        )
                
                asyncio.create_task(score_previous_phase())
                
                # Update current phase
                current_phase = new_phase
                
                # More direct, action-oriented instructions that trigger immediate response
                phase_instructions = {
                    "introduction": """START SPEAKING NOW. Welcome the candidate warmly to the interview. 
Say: "Hello and welcome! I'm excited to be your interviewer today. Let me quickly explain how this will work. We'll start with some questions about your resume and experience, then discuss your GitHub projects, followed by some technical questions, and finish with a coding challenge. Are you ready to begin?"
Wait for their response.""",

                    "resume": f"""START SPEAKING NOW. Transition to the Resume Round.
Say: "Great! Let's move to the Resume Round. I'd like to learn more about your experience."
Then immediately ask your FIRST question about their work experience, education, or a specific technology they've used.
You must ask exactly {questions_required} questions in this round. After each answer, ask the next question.
Be conversational and engage with their responses.""",

                    "github": f"""START SPEAKING NOW. Transition to the GitHub Round.
Say: "Excellent! Now let's talk about your GitHub projects and coding work."
Then immediately ask your FIRST question about their repositories, open source contributions, or coding projects.
You must ask exactly {questions_required} questions in this round.
Focus on technical decisions, challenges they faced, or interesting features they built.""",

                    "topic": f"""START SPEAKING NOW. Transition to the Topic Questions Round.
Say: "Great work so far! Now let's dive into some technical questions."
Then immediately ask your FIRST technical question relevant to the interview type (frontend, backend, etc.).
You must ask exactly {questions_required} technical questions.
These should test their knowledge depth. Ask follow-up questions based on their answers.""",

                    "coding": """START SPEAKING NOW. Announce the Coding Round.
Say: "Excellent work on all your answers! Now it's time for your coding challenge. I've given you a problem in the IDE - you can find it by clicking the 'IDE' button at the top right of your screen, right next to the Assets button. Take your time to read the question carefully, write your solution, and when you're ready, click 'Run Code' to submit. I'll give you feedback once you're done. Good luck!"
Wait quietly for them to complete the coding challenge.""",

                    "report": """START SPEAKING NOW. Conclude the interview.
Say: "That concludes our interview! Thank you so much for your time today. You did great! Would you like me to give you a quick summary of how you performed, including your strengths and areas for improvement?"
Wait for their response, then provide constructive feedback if they say yes."""
                }
                
                instruction = phase_instructions.get(new_phase, "Continue the interview. Ask the candidate a relevant question now.")
                print(f"[AGENT] Sending phase instruction for: {new_phase}")
                session.generate_reply(instructions=instruction)
                
            elif data_type == "INTERVIEW_SKIPPED":
                print(f"[AGENT] Interview skipped by candidate")
                session.generate_reply(
                    instructions="""The candidate has chosen to skip to the final report. 
                    
Acknowledge this choice politely but note that skipping sections will result in a score of 0. 
Say something like: "I see you've chosen to skip ahead. That's completely fine - I'll prepare your report now. Do keep in mind that skipped sections won't be scored. Thank you for your time today!"

Keep it brief and non-judgmental."""
                )
            
            elif data_type == "INTERVIEW_COMPLETE":
                print(f"[AGENT] Interview complete - scoring all phases and showing final report")
                
                # Score all phases - resume/github based on document content, topic based on conversation
                async def score_all_phases():
                    try:
                        import google.generativeai as genai
                        genai.configure(api_key=os.environ.get("GOOGLE_API_KEY"))
                        model = genai.GenerativeModel('gemini-2.5-flash')
                        
                        scores = {"resume": 0, "github": 0, "topic": 0}
                        
                        # Score RESUME based on document content
                        if resume_content:
                            resume_prompt = f"""Evaluate this resume for a technical interview. Score the DOCUMENT QUALITY.

RESUME CONTENT:
{resume_content}

Score from 0-100 based on:
- Technical skills and technologies listed (30%)
- Quality and relevance of projects described (35%)
- Work experience and achievements (20%)
- Education and certifications (15%)

Return ONLY this JSON (no markdown): {{"score": <0-100>}}"""

                            response = model.generate_content(resume_prompt)
                            response_text = response.text.strip()
                            if response_text.startswith("```"):
                                response_text = response_text.split("```")[1]
                                if response_text.startswith("json"):
                                    response_text = response_text[4:]
                            result = json.loads(response_text.strip())
                            scores["resume"] = result.get("score", 70)
                            print(f"[AGENT] Resume document scored: {scores['resume']}")
                        else:
                            scores["resume"] = 0
                            print("[AGENT] No resume uploaded, score = 0")
                        
                        # Score GITHUB based on document content
                        if github_content:
                            github_prompt = f"""Evaluate this GitHub profile for a technical interview. Score the PROFILE QUALITY.

GITHUB PROFILE:
{github_content}

Score from 0-100 based on:
- Number and quality of repositories (35%)
- Technical variety and complexity (30%)
- Project descriptions and documentation (20%)
- Recent activity and contributions (15%)

Return ONLY this JSON (no markdown): {{"score": <0-100>}}"""

                            response = model.generate_content(github_prompt)
                            response_text = response.text.strip()
                            if response_text.startswith("```"):
                                response_text = response_text.split("```")[1]
                                if response_text.startswith("json"):
                                    response_text = response_text[4:]
                            result = json.loads(response_text.strip())
                            scores["github"] = result.get("score", 70)
                            print(f"[AGENT] GitHub profile scored: {scores['github']}")
                        else:
                            scores["github"] = 0
                            print("[AGENT] No GitHub uploaded, score = 0")
                        
                        # Score TOPIC based on conversation quality
                        transcript = "\n".join([f"{msg['role'].upper()}: {msg['content']}" for msg in conversation_history])
                        
                        if transcript:
                            topic_prompt = f"""Evaluate the candidate's VERBAL ANSWERS during this interview.

INTERVIEW TRANSCRIPT:
{transcript}

Score from 0-100 based on:
- Depth and quality of technical explanations (40%)
- Knowledge accuracy and understanding (30%)
- Communication clarity (20%)
- Engagement and confidence (10%)

Return ONLY this JSON (no markdown): {{"score": <0-100>}}"""

                            response = model.generate_content(topic_prompt)
                            response_text = response.text.strip()
                            if response_text.startswith("```"):
                                response_text = response_text.split("```")[1]
                                if response_text.startswith("json"):
                                    response_text = response_text[4:]
                            result = json.loads(response_text.strip())
                            scores["topic"] = result.get("score", 70)
                            print(f"[AGENT] Topic conversation scored: {scores['topic']}")
                        else:
                            scores["topic"] = 50
                            print("[AGENT] No conversation to score, using default 50")
                        
                        print(f"[AGENT] All phases scored: {scores}")
                        
                        # Send all scores to frontend
                        for phase in ["resume", "github", "topic"]:
                            await ctx.room.local_participant.publish_data(
                                json.dumps({
                                    "type": "PHASE_SCORE",
                                    "phase": phase,
                                    "score": scores[phase]
                                }).encode(),
                                reliable=True
                            )
                            print(f"[AGENT] Sent {phase} score: {scores[phase]}")
                        
                    except Exception as e:
                        print(f"[AGENT] Phase scoring error: {e}")
                        # Send default scores on error
                        for phase in ["resume", "github", "topic"]:
                            await ctx.room.local_participant.publish_data(
                                json.dumps({
                                    "type": "PHASE_SCORE",
                                    "phase": phase,
                                    "score": 70
                                }).encode(),
                                reliable=True
                            )
                
                asyncio.create_task(score_all_phases())
                
                session.generate_reply(
                    instructions="""START SPEAKING NOW. The interview is officially complete.

Say: "That wraps up our interview! Your complete performance report is now on screen. Thank you for participating today. You can review your scores and then click the End Call button when you're ready to leave. Good luck with everything!"

Keep it brief and warm - the interview is done."""
                )
                
        except Exception as e:
            print(f"[AGENT] Error processing received data: {e}")
    
    # Wait for a human participant to join before greeting
    print("[AGENT] Checking for human participants...")
    
    # Check existing participants
    human_present = False
    for p in ctx.room.remote_participants.values():
        if p.identity.startswith("user-"):
            human_present = True
            print(f"[AGENT] Found existing human participant: {p.identity}")
            break
            
    if not human_present:
        print("[AGENT] No human participant found. Waiting for user to join...")
        user_joined_event = asyncio.Event()
        
        @ctx.room.on("participant_joined")
        def on_participant_joined(participant: rtc.RemoteParticipant):
            if participant.identity.startswith("user-"):
                print(f"[AGENT] Human participant joined: {participant.identity}")
                user_joined_event.set()
        
        # Wait for the event
        await user_joined_event.wait()
    
    print(f"[AGENT] Generating greeting for interview type: {interview_type}")
    
    # Wait for session to stabilize before greeting
    await asyncio.sleep(2)
    
    # Retry greeting up to 3 times if it fails
    for attempt in range(3):
        try:
            print(f"[AGENT] Greeting attempt {attempt + 1}...")
            await session.generate_reply(
                instructions="Introduce yourself as the interviewer and start the interview."
            )
            print("[AGENT] Greeting sent successfully!")
            break
        except Exception as e:
            print(f"[AGENT] Greeting attempt {attempt + 1} failed: {e}")
            if attempt < 2:
                await asyncio.sleep(2)  # Wait before retry
            else:
                print("[AGENT] All greeting attempts failed. Agent will respond when user speaks.")


if __name__ == "__main__":
    agents.cli.run_app(server)