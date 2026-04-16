import React, { useState, useEffect } from 'react';
import { LiveKitRoom, useTracks, VideoTrack, useRoomContext, RoomAudioRenderer, useIsSpeaking, StartAudio } from '@livekit/components-react';
import { Track } from 'livekit-client';
import {
    Mic, MicOff, Video, VideoOff, PhoneOff, Loader2, Sparkles, FileText, Code,
    MoreVertical, Settings, Radio, Activity, Cpu, Wifi
} from 'lucide-react';
import { useNavigate, useParams } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';

// Import asset components
import ResumeUploader from '../components/ResumeUploader';
import GithubInput from '../components/GithubInput';
import ParticleBackground from '../components/ParticleBackground';

// LiveKit server URL is fetched dynamically from token server

const InterviewRoom = () => {
    const [token, setToken] = useState("");
    const navigate = useNavigate();
    const { type } = useParams();
    const hasFetched = React.useRef(false);

    // Ordered 10-Step Sequence
    const loadingSteps = [
        { title: "INITIALIZING SESSION WORKSPACE", sub: "Allocating secure environment resources..." },
        { title: "ESTABLISHING SECURE UPLINK", sub: "Verifying encrypted handshake protocols..." },
        { title: "LOADING ASSESSMENT MODULES", sub: "Retrieving role-specific evaluation criteria..." },
        { title: "SYNCHRONIZING CONTEXT ENGINE", sub: "Injecting resume data and technical parameters..." },
        { title: "CALIBRATING AI MODELS", sub: "Optimizing neural response latency..." },
        { title: "CONFIGURING AUDIO STREAMS", sub: "Setting up noise cancellation inputs..." },
        { title: "GENERATING INTERVIEW GRAPH", sub: "Building dynamic question logic pathways..." },
        { title: "VERIFYING SYSTEM INTEGRITY", sub: "Running final diagnostic checks..." },
        { title: "BUFFERING ASSETS", sub: "Pre-loading high-fidelity interface elements..." },
        { title: "LAUNCHING SEQUENCED PROTOCOL", sub: "Activating live simulation interface..." }
    ];

    const [currentStep, setCurrentStep] = useState(0);
    const [tokenReady, setTokenReady] = useState(null);
    const [serverUrl, setServerUrl] = useState("");

    // 1. Fetch Token Immediately (Background)
    useEffect(() => {
        if (hasFetched.current) return;
        hasFetched.current = true;

        const fetchToken = async () => {
            try {
                const baseUrl = import.meta.env.VITE_API_URL || 'http://localhost:3000';
                const response = await fetch(`${baseUrl}/getToken?type=${type || 'default'}`);
                const data = await response.json();
                setTokenReady(data.token);
                setServerUrl(data.url);  // Get URL from token server
            } catch (error) {
                console.error("Failed to fetch token:", error);
            }
        };
        fetchToken();
    }, [type]);

    // 2. Run Sequence Animation
    useEffect(() => {
        if (currentStep < loadingSteps.length - 1) {
            const timer = setTimeout(() => {
                setCurrentStep(prev => prev + 1);
            }, 600); // 600ms per step = ~6 seconds total
            return () => clearTimeout(timer);
        } else if (currentStep === loadingSteps.length - 1) {
            // Sequence done. Check if token is ready.
            if (tokenReady) {
                // Add a small delay for the final step to be readable before switching
                const finalDelay = setTimeout(() => {
                    setToken(tokenReady);
                }, 800);
                return () => clearTimeout(finalDelay);
            }
            // If token not ready yet, it will wait here until tokenReady changes
        }
    }, [currentStep, tokenReady]);

    const activeStep = loadingSteps[currentStep];
    const progress = ((currentStep + 1) / loadingSteps.length) * 100;

    if (!token) {
        return (
            <div className="min-h-screen flex flex-col items-center justify-center bg-[#030014] text-foreground relative overflow-hidden">
                <div className="absolute inset-0 z-0">
                    <div className="perspective-grid" />
                    <div className="absolute top-[20%] left-[20%] w-[30%] h-[30%] rounded-full bg-indigo-600/20 blur-[100px] animate-pulse-slow" />
                </div>
                <motion.div
                    key="loader"
                    initial={{ scale: 0.9, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    className="flex flex-col items-center gap-8 z-10 glass-panel p-12 rounded-3xl border-white/10 shadow-2xl relative w-full max-w-xl"
                >
                    <div className="absolute inset-0 z-0 pointer-events-none rounded-3xl overflow-hidden">
                        <div className="absolute top-0 left-0 w-full h-[1px] bg-gradient-to-r from-transparent via-indigo-500 to-transparent animate-border-beam" />
                    </div>

                    <div className="relative">
                        <div className="w-24 h-24 rounded-full border-r-2 border-t-2 border-indigo-500 animate-spin" />
                        <div className="absolute inset-0 rounded-full border-l-2 border-b-2 border-purple-500 animate-[spin_1.5s_linear_infinite_reverse]" />
                        <div className="absolute inset-0 flex items-center justify-center">
                            <Cpu className="w-8 h-8 text-white animate-pulse" />
                        </div>
                    </div>

                    <div className="text-center space-y-4 w-full">
                        <AnimatePresence mode="wait">
                            <motion.div
                                key={activeStep.title} // Triggers animation on change
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: -10 }}
                                transition={{ duration: 0.3 }}
                                className="space-y-2"
                            >
                                <h2 className="text-2xl font-display font-bold tracking-tight uppercase text-transparent bg-clip-text bg-gradient-to-r from-white to-gray-400">
                                    {activeStep.title}
                                </h2>
                                <p className="text-indigo-400 font-mono text-xs tracking-widest uppercase">
                                    {activeStep.sub}
                                </p>
                            </motion.div>
                        </AnimatePresence>

                        {/* Progress Bar */}
                        <div className="w-full h-1 bg-white/10 rounded-full overflow-hidden mt-6">
                            <motion.div
                                className="h-full bg-indigo-500"
                                initial={{ width: 0 }}
                                animate={{ width: `${progress}%` }}
                                transition={{ duration: 0.5, ease: "linear" }}
                            />
                        </div>
                        <div className="flex justify-between text-[10px] font-mono text-muted uppercase">
                            <span>Step {currentStep + 1}/{loadingSteps.length}</span>
                            <span>{Math.round(progress)}%</span>
                        </div>
                    </div>
                </motion.div>
            </div>
        );
    }

    return (
        <LiveKitRoom
            video={true}
            audio={true}
            token={token}
            serverUrl={serverUrl}
            data-lk-theme="default"
            className="h-screen w-full bg-[#030014] overflow-hidden relative font-sans"
            onDisconnected={() => navigate('/')}
        >
            <motion.div
                initial={{ opacity: 0, scale: 0.95, filter: "blur(10px)" }}
                animate={{ opacity: 1, scale: 1, filter: "blur(0px)" }}
                exit={{ opacity: 0, scale: 1.05, filter: "blur(10px)" }}
                transition={{ duration: 0.8, ease: "circOut" }}
                className="absolute inset-0 z-0"
            />

            {/* Ambient Background & Grid */}
            <div className="absolute inset-0 z-0 pointer-events-none">
                <ParticleBackground />
                <div className="perspective-grid opacity-30" />
                <div className="absolute top-[-10%] right-[-10%] w-[40%] h-[40%] rounded-full bg-indigo-600/10 blur-[120px]" />
                <div className="absolute bottom-[-10%] left-[-10%] w-[40%] h-[40%] rounded-full bg-purple-600/10 blur-[120px]" />
            </div>

            <RoomContent />
            <RoomAudioRenderer />
            <StartAudio label="Click to allow audio playback" className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 z-50 bg-indigo-600 text-white px-6 py-3 rounded-full font-bold shadow-2xl hover:bg-indigo-700 transition-colors" />
        </LiveKitRoom>
    );
};


const ParticipantTile = ({ track, participant, isLocal }) => {
    const isSpeaking = useIsSpeaking(participant);

    return (
        <motion.div
            layout
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{ duration: 0.4, type: "spring", bounce: 0.2 }}
            className={`relative w-full aspect-video rounded-[2rem] overflow-hidden border transition-all duration-300 isolate group ${isSpeaking
                ? 'border-indigo-500/50 shadow-[0_0_50px_-10px_rgba(99,102,241,0.5)]'
                : 'border-white/5 hover:border-white/10'
                } bg-black/40 backdrop-blur-sm`}
        >
            {/* Corner Accents (HUD style) */}
            <div className={`absolute top-4 left-4 w-8 h-8 border-t-2 border-l-2 rounded-tl-xl transition-colors duration-300 ${isSpeaking ? 'border-indigo-500' : 'border-white/10'}`} />
            <div className={`absolute bottom-4 right-4 w-8 h-8 border-b-2 border-r-2 rounded-br-xl transition-colors duration-300 ${isSpeaking ? 'border-indigo-500' : 'border-white/10'}`} />

            {track ? (
                <VideoTrack trackRef={track} className="w-full h-full object-cover" />
            ) : (
                <div className="w-full h-full bg-[#05050a] flex items-center justify-center relative">
                    <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-20" />

                    <div className={`w-40 h-40 rounded-full flex items-center justify-center relative z-10 transition-transform duration-300 ${isSpeaking ? "scale-110" : "scale-100"}`}>
                        {/* Complex Audio Ripple */}
                        {isSpeaking && (
                            <>
                                <div className="absolute inset-0 rounded-full border border-indigo-500/30 animate-[ping_1.5s_ease-out_infinite]" />
                                <div className="absolute inset-0 rounded-full border-2 border-purple-500/20 animate-[ping_2s_ease-out_infinite] delay-75" />
                                <div className="absolute inset-0 rounded-full bg-indigo-500/10 blur-xl animate-pulse" />
                            </>
                        )}

                        <div className={`w-32 h-32 rounded-full flex items-center justify-center ${isLocal ? 'bg-zinc-900 border border-white/10' : 'bg-gradient-to-tr from-indigo-600 to-purple-600'} shadow-2xl relative overflow-hidden`}>
                            {!isLocal && <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-30 mix-blend-overlay" />}
                            <span className="text-5xl filter drop-shadow-lg z-10">{isLocal ? "👤" : "🤖"}</span>
                        </div>
                    </div>
                </div>
            )}

            {/* Name Tag HUD */}
            <div className="absolute bottom-6 left-8 z-20">
                <div className="glass-panel px-5 py-2.5 rounded-full flex items-center gap-3 border-white/10">
                    <div className={`relative w-2.5 h-2.5 flex items-center justify-center`}>
                        <div className={`absolute inset-0 rounded-full ${isSpeaking ? "bg-green-500 animate-ping opacity-75" : ""}`} />
                        <div className={`relative w-2 h-2 rounded-full ${isSpeaking ? "bg-green-500" : "bg-zinc-500"}`} />
                    </div>
                    <span className="text-sm font-bold tracking-wider text-white">{isLocal ? "CANDIDATE" : "AI INTERVIEWER"}</span>
                    {!isLocal && (
                        <div className="flex items-center gap-1.5 ml-2 px-1.5 py-0.5 bg-indigo-500/20 border border-indigo-500/30 rounded text-[10px] font-mono text-indigo-300">
                            <Wifi className="w-3 h-3" />
                            LIVE
                        </div>
                    )}
                </div>
            </div>

            {/* Audio Visualizer (Simulated) */}
            {isSpeaking && !isLocal && (
                <div className="absolute top-8 right-8 flex gap-1 items-end h-8">
                    {[1, 2, 3, 4, 5].map(i => (
                        <div
                            key={i}
                            className="w-1.5 bg-indigo-400 rounded-full animate-[pulse_0.4s_ease-in-out_infinite]"
                            style={{
                                height: `${Math.random() * 60 + 40}%`,
                                animationDelay: `${i * 0.05}s`,
                                opacity: 0.8
                            }}
                        />
                    ))}
                </div>
            )}
        </motion.div>
    );
};

const RoomContent = () => {
    const tracks = useTracks([
        { source: Track.Source.Camera, withPlaceholder: true },
        { source: Track.Source.ScreenShare, withPlaceholder: false },
    ]);

    const room = useRoomContext();
    const { type } = useParams();
    const [isMicOn, setIsMicOn] = useState(true);
    const [isCamOn, setIsCamOn] = useState(true);
    const [showAssets, setShowAssets] = useState(false);
    const [showIDE, setShowIDE] = useState(false);
    const [codeContent, setCodeContent] = useState(`// Write your solution here

function solution() {
    
}
`);
    // Detect track from URL params
    const interviewTrack = type || 'frontend';

    // Track-based question pools
    const questionPools = {
        frontend: [
            {
                title: "Debounce Function - Medium",
                description: "Implement a debounce function that delays invoking func until after wait milliseconds have elapsed since the last time the debounced function was invoked.",
                examples: [
                    { input: 'debounce(console.log, 100)("hello")', output: 'logs "hello" after 100ms', explanation: 'Function is called after delay' }
                ],
                constraints: ['0 ≤ wait ≤ 1000', 'func is a valid function']
            },
            {
                title: "DOM Element Finder - Easy",
                description: "Write a function that finds all elements with a specific class name and returns them as an array.",
                examples: [
                    { input: 'findByClass("active")', output: '[<div class="active">, <span class="active">]', explanation: 'Returns array of matching elements' }
                ],
                constraints: ['className is a valid string', 'Return empty array if no matches']
            }
        ],
        backend: [
            {
                title: "Rate Limiter - Hard",
                description: "Design a rate limiter that allows at most N requests per time window.",
                examples: [
                    { input: 'RateLimiter(3, 60)', output: 'true/false for each request', explanation: 'Returns false when limit exceeded' }
                ],
                constraints: ['1 ≤ N ≤ 1000', '1 ≤ window ≤ 3600']
            }
        ],
        fullstack: [
            {
                title: "Real-time Message Queue - Hard",
                description: "Design a message queue system that handles real-time chat messages with guaranteed delivery.",
                examples: [
                    { input: 'MessageQueue with user1 sending to user2', output: 'Messages delivered in order', explanation: 'FIFO guarantee' }
                ],
                constraints: ['Handle network failures', 'Maintain message ordering']
            }
        ]
    };

    const getRandomQuestion = (track) => {
        const questions = questionPools[track] || questionPools.frontend;
        return questions[Math.floor(Math.random() * questions.length)];
    };

    const [currentQuestion, setCurrentQuestion] = useState(getRandomQuestion(interviewTrack));
    const [evaluationResult, setEvaluationResult] = useState(null);
    const [isEvaluating, setIsEvaluating] = useState(false);
    const [showAnalysis, setShowAnalysis] = useState(false);

    // ===== INTERVIEW WORKFLOW STATE =====
    const PHASES = ['introduction', 'resume', 'github', 'topic', 'coding', 'report'];
    const PHASE_LABELS = {
        introduction: '👋 Introduction',
        resume: '📄 Resume Round',
        github: '💻 GitHub Round',
        topic: '🎯 Topic Questions',
        coding: '⌨️ Coding Round',
        report: '📊 Final Report'
    };
    const PHASE_WEIGHTS = { resume: 15, github: 15, topic: 25, coding: 45 };

    const [interviewPhase, setInterviewPhase] = useState('introduction');
    const [phaseScores, setPhaseScores] = useState({
        resume: 0,
        github: 0,
        topic: 0,
        coding: 0
    });
    const [skippedSections, setSkippedSections] = useState(false);

    // ===== REAL-TIME METRICS TRACKING =====
    const [metricsData, setMetricsData] = useState({
        resumeUploaded: false,
        githubUploaded: false,
        totalInterviewTime: 0
    });
    const metricsRef = React.useRef({
        interviewStartTime: Date.now()
    });

    // Update total interview time periodically
    React.useEffect(() => {
        const interval = setInterval(() => {
            setMetricsData(prev => ({
                ...prev,
                totalInterviewTime: (Date.now() - metricsRef.current.interviewStartTime) / 1000
            }));
        }, 5000);
        return () => clearInterval(interval);
    }, []);

    // Calculate final weighted score
    const calculateFinalScore = () => {
        if (skippedSections) return { score: 0, reason: 'Skipped Sections' };

        const weightedScore =
            (phaseScores.resume * PHASE_WEIGHTS.resume / 100) +
            (phaseScores.github * PHASE_WEIGHTS.github / 100) +
            (phaseScores.topic * PHASE_WEIGHTS.topic / 100) +
            (phaseScores.coding * PHASE_WEIGHTS.coding / 100);

        return { score: Math.round(weightedScore), reason: null };
    };

    // Handle skip - go directly to report with score 0
    const handleSkipInterview = () => {
        setSkippedSections(true);
        setInterviewPhase('report');
        if (room && room.localParticipant) {
            room.localParticipant.publishData(
                new TextEncoder().encode(JSON.stringify({
                    type: 'INTERVIEW_SKIPPED',
                    content: 'Candidate skipped remaining sections'
                })),
                { reliable: true }
            );
        }
    };

    // Advance to next phase
    const advancePhase = () => {
        const currentIndex = PHASES.indexOf(interviewPhase);
        if (currentIndex < PHASES.length - 1) {
            const nextPhase = PHASES[currentIndex + 1];
            setInterviewPhase(nextPhase);
            if (room && room.localParticipant) {
                room.localParticipant.publishData(
                    new TextEncoder().encode(JSON.stringify({
                        type: 'PHASE_CHANGE',
                        phase: nextPhase
                    })),
                    { reliable: true }
                );
            }
        }
    };

    const toggleMic = async () => {
        if (room.localParticipant) {
            const newState = !isMicOn;
            await room.localParticipant.setMicrophoneEnabled(newState);
            setIsMicOn(newState);
        }
    };

    const toggleCam = async () => {
        if (room.localParticipant) {
            const newState = !isCamOn;
            await room.localParticipant.setCameraEnabled(newState);
            setIsCamOn(newState);
        }
    };

    const leaveRoom = () => room.disconnect();

    // Listen for data from agent
    useEffect(() => {
        if (!room) return;

        const handleDataReceived = (payload, participant) => {
            try {
                const data = JSON.parse(new TextDecoder().decode(payload));

                // Handle AI code analysis result
                if (data.type === 'CODE_ANALYSIS_RESULT') {
                    console.log('[FRONTEND] Received AI code analysis result');
                    const result = data.result;

                    const analysis = {
                        overallScore: result.overallScore || 0,
                        verdict: result.verdict || 'Unknown',
                        runtimeErrors: [],
                        sections: [
                            {
                                title: '🧠 Logic & Correctness',
                                score: result.logic?.score || 0,
                                feedback: result.logic?.feedback || 'No feedback available',
                                suggestions: result.suggestions?.slice(0, 2) || []
                            },
                            {
                                title: '⚠️ Edge Case Handling',
                                score: result.edgeCases?.score || 0,
                                feedback: result.edgeCases?.feedback || 'No feedback available',
                                suggestions: []
                            },
                            {
                                title: '📖 Code Quality',
                                score: result.readability?.score || 0,
                                feedback: result.readability?.feedback || 'No feedback available',
                                suggestions: []
                            },
                            {
                                title: '⚡ Efficiency',
                                score: result.efficiency?.score || 0,
                                feedback: result.efficiency?.feedback || 'No feedback available',
                                suggestions: result.suggestions?.slice(2, 4) || []
                            }
                        ],
                        summary: result.summary || 'Analysis complete.'
                    };

                    setEvaluationResult(analysis);
                    setShowAnalysis(true);
                    setIsEvaluating(false);

                    // Update coding phase score
                    setPhaseScores(prev => ({
                        ...prev,
                        coding: analysis.overallScore
                    }));

                    // Send feedback for AI to speak
                    room.localParticipant.publishData(
                        new TextEncoder().encode(JSON.stringify({
                            type: 'CODE_FEEDBACK',
                            feedback: {
                                score: analysis.overallScore,
                                verdict: analysis.verdict,
                                summary: analysis.summary,
                                suggestions: result.suggestions?.slice(0, 3) || []
                            }
                        })),
                        { reliable: true }
                    );
                }

                // Handle new coding question from agent
                if (data.type === 'coding_question') {
                    setCurrentQuestion({
                        title: data.title || 'Coding Challenge',
                        description: data.description || 'Solve this problem.',
                        examples: data.examples || [],
                        constraints: data.constraints || []
                    });
                    setEvaluationResult(null);
                    setShowIDE(true);
                }

                // Handle phase score from agent
                if (data.type === 'PHASE_SCORE') {
                    console.log(`[FRONTEND] Received phase score: ${data.phase} = ${data.score}`);
                    setPhaseScores(prev => ({
                        ...prev,
                        [data.phase]: data.score
                    }));
                    // Track which phases have been scored (not just count)
                    setReceivedScores(prev => ({
                        ...prev,
                        [data.phase]: true
                    }));
                }
            } catch (error) {
                console.error('Error parsing data:', error);
            }
        };

        room.on('dataReceived', handleDataReceived);
        return () => room.off('dataReceived', handleDataReceived);
    }, [room]);

    // AI-based code analysis - sends to agent for Gemini evaluation
    const evaluateCode = async (code) => {
        setIsEvaluating(true);
        setEvaluationResult(null);

        try {
            if (!room || !room.localParticipant) {
                throw new Error('Not connected to room');
            }

            console.log('[FRONTEND] Sending code to AI for analysis...');
            room.localParticipant.publishData(
                new TextEncoder().encode(JSON.stringify({
                    type: 'CODE_ANALYSIS',
                    code: code,
                    question: {
                        title: currentQuestion.title,
                        description: currentQuestion.description
                    }
                })),
                { reliable: true }
            );

            // The result will come back via the dataReceived handler above
            // Set a timeout in case agent doesn't respond
            setTimeout(() => {
                if (isEvaluating) {
                    setIsEvaluating(false);
                    setEvaluationResult({
                        overallScore: 0,
                        verdict: 'Timeout',
                        runtimeErrors: ['Analysis timed out'],
                        sections: [],
                        summary: 'Unable to get AI analysis. Please try again.'
                    });
                    setShowAnalysis(true);
                }
            }, 30000);

        } catch (error) {
            console.error('Code evaluation failed:', error);
            setIsEvaluating(false);
            setEvaluationResult({
                overallScore: 0,
                verdict: 'Error',
                runtimeErrors: ['Failed to connect to AI'],
                sections: [],
                summary: 'Unable to analyze code. Please ensure you are connected.'
            });
            setShowAnalysis(true);
        }
    };

    // State for waiting on phase scores
    const [waitingForScores, setWaitingForScores] = useState(false);
    const [receivedScores, setReceivedScores] = useState({ resume: false, github: false, topic: false }); // Track which phases scored
    const waitingForScoresRef = React.useRef(false); // Ref to track in timeout

    // Handle closing analysis popup - waits for scores then shows report
    const handleCloseAnalysis = () => {
        setShowAnalysis(false);
        setShowIDE(false);
        setWaitingForScores(true);
        waitingForScoresRef.current = true;
        setReceivedScores({ resume: false, github: false, topic: false }); // Reset tracker

        console.log('[FRONTEND] Waiting for phase scores before showing report...');

        // Notify agent interview is complete - it will score phases and send scores back
        if (room && room.localParticipant) {
            room.localParticipant.publishData(
                new TextEncoder().encode(JSON.stringify({
                    type: 'INTERVIEW_COMPLETE',
                    message: 'Interview finished, show final report'
                })),
                { reliable: true }
            );
        }
        // No timeout - wait indefinitely for all 3 scores
    };

    // Listen for phase scores and show report when all 3 received
    useEffect(() => {
        const allReceived = receivedScores.resume && receivedScores.github && receivedScores.topic;
        if (waitingForScores && allReceived) {
            console.log('[FRONTEND] All 3 scores received, showing report now');
            waitingForScoresRef.current = false;
            setWaitingForScores(false);
            setInterviewPhase('report');
        }
    }, [waitingForScores, receivedScores]);

    const localTrack = tracks.find(t => t.participant.isLocal);
    const remoteTracks = tracks.filter(t => !t.participant.isLocal);
    const agentTrack = remoteTracks.length > 0 ? remoteTracks[0] : null;
    const agentParticipant = agentTrack?.participant;

    return (
        <div className="h-full flex flex-col relative z-10 p-4 md:p-6">
            {/* Loading Screen while waiting for scores */}
            {waitingForScores && (
                <div className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center">
                    <div className="text-center">
                        <div className="w-16 h-16 border-4 border-indigo-500/30 border-t-indigo-500 rounded-full animate-spin mx-auto mb-6"></div>
                        <h2 className="text-2xl font-bold text-white mb-2">Generating Your Report</h2>
                        <p className="text-gray-400 mb-4">Analyzing your interview performance...</p>
                        <div className="flex justify-center gap-4 text-sm">
                            <span className={`px-3 py-1 rounded-full ${receivedScores.resume ? 'bg-green-500/20 text-green-400' : 'bg-gray-700 text-gray-500'}`}>
                                📄 Resume {receivedScores.resume ? '✓' : '...'}
                            </span>
                            <span className={`px-3 py-1 rounded-full ${receivedScores.github ? 'bg-green-500/20 text-green-400' : 'bg-gray-700 text-gray-500'}`}>
                                💻 GitHub {receivedScores.github ? '✓' : '...'}
                            </span>
                            <span className={`px-3 py-1 rounded-full ${receivedScores.topic ? 'bg-green-500/20 text-green-400' : 'bg-gray-700 text-gray-500'}`}>
                                🎯 Topic {receivedScores.topic ? '✓' : '...'}
                            </span>
                        </div>
                    </div>
                </div>
            )}
            {/* Top Bar HUD */}
            <header className="flex justify-between items-start mb-4">
                <div className="flex flex-col">
                    <div className="flex items-center gap-3 mb-1">
                        <div className="w-10 h-10 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center relative overflow-hidden group">
                            <div className="absolute inset-0 bg-gradient-to-tr from-indigo-500 to-purple-500 opacity-0 group-hover:opacity-20 transition-opacity" />
                            <span className="text-white font-black text-xl tracking-tighter">PV</span>
                        </div>
                        <div>
                            <h1 className="font-display font-bold text-lg tracking-tight leading-none">PracterViews</h1>
                            <span className="text-[10px] font-mono text-indigo-400 tracking-widest uppercase">Simulation Room 01</span>
                        </div>
                    </div>
                </div>

                <div className="flex items-center gap-3">
                    {/* IDE Toggle Button - Always Available */}
                    <button
                        onClick={() => setShowIDE(!showIDE)}
                        className={`px-4 py-2 rounded-full text-sm font-medium transition-all flex items-center gap-2 border relative ${showIDE
                            ? 'bg-blue-500/20 border-blue-500 text-blue-400'
                            : 'bg-white/5 border-white/10 text-gray-400 hover:bg-white/10 hover:border-white/20'
                            }`}
                    >
                        <Code className="w-4 h-4" />
                        IDE
                    </button>

                    {/* Assets Toggle Button */}
                    <button
                        onClick={() => setShowAssets(!showAssets)}
                        className={`px-4 py-2 rounded-full text-sm font-medium transition-all flex items-center gap-2 border ${showAssets
                            ? 'bg-indigo-500/20 border-indigo-500 text-indigo-400'
                            : 'bg-white/5 border-white/10 text-gray-400 hover:bg-white/10 hover:border-white/20'
                            }`}
                    >
                        <FileText className="w-4 h-4" />
                        Assets
                    </button>

                    {/* Connection Status */}
                    <div className="bg-white/5 border border-white/10 px-4 py-2 rounded-full text-sm text-gray-300 backdrop-blur-sm">
                        {agentParticipant ? "Connected" : "Waiting for Interviewer..."}
                    </div>
                </div>
            </header>

            {/* Phase indicator removed for cleaner UI */}

            {/* Main Stage */}
            <div className="flex-1 flex flex-col justify-center min-h-0 relative z-0">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 w-full h-full max-h-[80vh]">
                    {/* Agent View */}
                    <div className="relative w-full h-full min-h-[300px] flex items-center justify-center">
                        <AnimatePresence mode="wait">
                            {agentParticipant ? (
                                <ParticipantTile key="agent" track={agentTrack} participant={agentParticipant} isLocal={false} />
                            ) : (
                                <motion.div
                                    initial={{ opacity: 0 }}
                                    animate={{ opacity: 1 }}
                                    exit={{ opacity: 0 }}
                                    className="w-full max-w-4xl aspect-video rounded-[1.5rem] border border-white/5 bg-[#0a0a0f] flex flex-col items-center justify-center gap-6"
                                >
                                    <div className="w-24 h-24 rounded-full border border-white/10 bg-black/50 backdrop-blur-md flex items-center justify-center">
                                        <Loader2 className="w-8 h-8 text-indigo-400 animate-spin" />
                                    </div>
                                    <div className="text-center">
                                        <h3 className="text-lg font-medium text-white">Connecting to Agent...</h3>
                                        <p className="text-indigo-400/60 text-xs font-mono tracking-widest">ESTABLISHING UPLINK</p>
                                    </div>
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </div>

                    {/* User View */}
                    <div className="relative w-full h-full min-h-[300px] flex items-center justify-center">
                        {room.localParticipant ? (
                            <ParticipantTile track={localTrack} participant={room.localParticipant} isLocal={true} />
                        ) : (
                            <div className="w-full max-w-4xl aspect-video rounded-[1.5rem] bg-[#0a0a0f] border border-white/5 flex items-center justify-center text-gray-500">
                                <Loader2 className="w-8 h-8 animate-spin" />
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Float Dock Controls */}
            <div className="flex justify-center mt-6 mb-2">
                <motion.div
                    className="glass-panel px-8 py-4 rounded-full flex items-center gap-8 shadow-2xl shadow-indigo-900/20 border border-white/10 bg-black/40 backdrop-blur-xl"
                    initial={{ y: 50, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    transition={{ delay: 0.5, type: "spring" }}
                >
                    <div className="flex items-center gap-4">
                        <ControlButton
                            onClick={toggleMic}
                            isActive={isMicOn}
                            onIcon={<Mic />}
                            offIcon={<MicOff />}
                            activeClass="bg-white text-black shadow-[0_0_20px_rgba(255,255,255,0.3)]"
                            inactiveClass="bg-red-500/20 text-red-500 border border-red-500/30"
                        />
                        <ControlButton
                            onClick={toggleCam}
                            isActive={isCamOn}
                            onIcon={<Video />}
                            offIcon={<VideoOff />}
                            activeClass="bg-white text-black shadow-[0_0_20px_rgba(255,255,255,0.3)]"
                            inactiveClass="bg-red-500/20 text-red-500 border border-red-500/30"
                        />
                    </div>

                    <div className="w-px h-10 bg-white/10" />

                    <motion.button
                        whileHover={{ scale: 1.05, backgroundColor: "#ef4444" }}
                        whileTap={{ scale: 0.95 }}
                        onClick={leaveRoom}
                        className="px-8 py-4 bg-red-600/90 text-white rounded-full font-bold text-sm flex items-center gap-2 shadow-lg shadow-red-500/20 transition-all border border-red-500/50"
                    >
                        <PhoneOff className="w-4 h-4" />
                        TERMINATE
                    </motion.button>
                </motion.div>
            </div>

            {/* Final Report Panel */}
            <AnimatePresence>
                {interviewPhase === 'report' && (
                    <motion.div
                        initial={{ opacity: 0, y: 100 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: 100 }}
                        transition={{ type: "spring", damping: 25 }}
                        className="fixed inset-x-0 bottom-0 z-50 p-6"
                    >
                        <div className="max-w-4xl mx-auto bg-gradient-to-br from-gray-900/95 to-gray-800/95 backdrop-blur-xl border border-gray-700 rounded-2xl p-6 shadow-2xl">
                            {/* Report Header */}
                            <div className="flex justify-between items-start mb-6">
                                <div>
                                    <h2 className="text-2xl font-bold text-white flex items-center gap-2">
                                        📊 Interview Report
                                    </h2>
                                    <p className="text-sm text-gray-400">Performance Summary</p>
                                </div>
                                <div className="text-right">
                                    <div className={`text-4xl font-bold ${skippedSections ? 'text-red-400' :
                                        calculateFinalScore().score >= 70 ? 'text-green-400' :
                                            calculateFinalScore().score >= 50 ? 'text-yellow-400' : 'text-red-400'
                                        }`}>
                                        {skippedSections ? '0' : calculateFinalScore().score}/100
                                    </div>
                                    {skippedSections && (
                                        <span className="text-xs text-red-400">Skipped Sections</span>
                                    )}
                                </div>
                            </div>

                            {/* Score Breakdown */}
                            <div className="grid grid-cols-4 gap-3 mb-6">
                                {[
                                    { label: 'Resume', score: phaseScores.resume, weight: '15%', icon: '📄' },
                                    { label: 'GitHub', score: phaseScores.github, weight: '15%', icon: '💻' },
                                    { label: 'Topic', score: phaseScores.topic, weight: '25%', icon: '🎯' },
                                    { label: 'Coding', score: phaseScores.coding, weight: '45%', icon: '⌨️' }
                                ].map((phase, i) => (
                                    <div key={i} className="bg-black/30 rounded-lg p-3 text-center">
                                        <div className="text-xl mb-1">{phase.icon}</div>
                                        <div className="text-xs text-gray-400">{phase.label}</div>
                                        <div className={`text-lg font-bold ${phase.score >= 70 ? 'text-green-400' :
                                            phase.score >= 50 ? 'text-yellow-400' : 'text-red-400'
                                            }`}>
                                            {skippedSections ? '-' : phase.score}
                                        </div>
                                        <div className="text-[10px] text-gray-500">({phase.weight})</div>
                                    </div>
                                ))}
                            </div>

                            {/* Coding Analysis Summary */}
                            {evaluationResult && (
                                <div className="bg-black/20 rounded-lg p-4 mb-6">
                                    <h4 className="text-sm font-semibold text-blue-400 mb-2">💻 Coding Analysis</h4>
                                    <p className="text-gray-300 text-sm">{evaluationResult.summary}</p>
                                    <div className="mt-2 flex gap-2 flex-wrap">
                                        {evaluationResult.sections?.map((section, i) => (
                                            <span key={i} className={`px-2 py-1 rounded text-xs ${section.score >= 70 ? 'bg-green-500/20 text-green-400' :
                                                section.score >= 50 ? 'bg-yellow-500/20 text-yellow-400' :
                                                    'bg-red-500/20 text-red-400'
                                                }`}>
                                                {section.title.split(' ')[0]} {section.score}
                                            </span>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* Return Button */}
                            <div className="mt-4 text-center">
                                <button
                                    onClick={() => window.location.href = '/'}
                                    className="px-8 py-3 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white rounded-xl font-medium transition-all"
                                >
                                    Return to Dashboard
                                </button>
                            </div>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Assets Panel Overlay */}
            <AnimatePresence>
                {showAssets && (
                    <>
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            onClick={() => setShowAssets(false)}
                            className="fixed inset-0 bg-black/60 backdrop-blur-md z-40"
                        />
                        <motion.div
                            initial={{ x: "100%", opacity: 0 }}
                            animate={{ x: 0, opacity: 1 }}
                            exit={{ x: "100%", opacity: 0 }}
                            transition={{ type: "spring", damping: 30, stiffness: 300 }}
                            className="fixed right-0 top-0 bottom-0 w-full max-w-md bg-[#0a0a0f] border-l border-white/10 p-8 flex flex-col gap-6 z-50 shadow-2xl"
                        >
                            <div className="flex items-center justify-between pb-6 border-b border-white/5">
                                <h3 className="font-display font-bold text-xl flex items-center gap-3 text-white">
                                    <FileText className="w-5 h-5 text-indigo-400" />
                                    Context Assets
                                </h3>
                                <button onClick={() => setShowAssets(false)} className="p-2 rounded-full hover:bg-white/10 text-gray-400 hover:text-white">
                                    ✕
                                </button>
                            </div>

                            <div className="flex-1 overflow-y-auto space-y-10">
                                <section>
                                    <h4 className="text-sm font-bold text-white uppercase mb-4">Resume Data</h4>
                                    <ResumeUploader />
                                </section>
                                <section>
                                    <h4 className="text-sm font-bold text-white uppercase mb-4">GitHub Profile</h4>
                                    <GithubInput />
                                </section>
                            </div>
                        </motion.div>
                    </>
                )}
            </AnimatePresence>

            {/* IDE Panel - Always Available (No Phase Lock) */}
            <AnimatePresence>
                {showIDE && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="absolute inset-0 bg-black/80 backdrop-blur-sm z-40 flex items-center justify-center"
                    >
                        <motion.div
                            initial={{ scale: 0.9, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0.9, opacity: 0 }}
                            className="w-[95%] h-[90%] bg-[#0d1117] border border-gray-700 rounded-lg flex"
                        >
                            {/* Question Panel - Always Shows Question */}
                            <div className="w-1/3 bg-gray-100 p-6 border-r border-gray-300 rounded-l-lg overflow-y-auto">
                                <h2 className="text-lg font-bold text-gray-800 mb-4">Question</h2>
                                <div className="mb-6">
                                    <h3 className="font-semibold text-gray-800 mb-2">{currentQuestion.title}</h3>
                                    <p className="text-sm text-gray-600 mb-4">{currentQuestion.description}</p>

                                    {currentQuestion.examples?.length > 0 && (
                                        <div className="space-y-3 text-sm text-gray-600">
                                            {currentQuestion.examples.map((example, index) => (
                                                <div key={index}>
                                                    <strong>Example {index + 1}:</strong><br />
                                                    <span className="font-mono bg-gray-200 px-1 rounded">Input: {example.input}</span><br />
                                                    <span className="font-mono bg-gray-200 px-1 rounded">Output: {example.output}</span>
                                                </div>
                                            ))}
                                        </div>
                                    )}

                                    {currentQuestion.constraints?.length > 0 && (
                                        <div className="mt-4 pt-4 border-t border-gray-300">
                                            <h4 className="font-semibold text-gray-800 mb-2">Constraints:</h4>
                                            <ul className="text-xs text-gray-600 space-y-1">
                                                {currentQuestion.constraints.map((c, i) => (
                                                    <li key={i}>• {c}</li>
                                                ))}
                                            </ul>
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* Code Editor - Always Available */}
                            <div className="flex-1 bg-[#0d1117] text-white p-4 flex flex-col">
                                <div className="flex justify-between items-center mb-4">
                                    <h3 className="text-sm font-semibold text-gray-300">Solution</h3>
                                    <button onClick={() => setShowIDE(false)} className="text-gray-400 hover:text-white text-xl">✕</button>
                                </div>

                                <textarea
                                    value={codeContent}
                                    onChange={(e) => setCodeContent(e.target.value)}
                                    className="flex-1 bg-[#161b22] border border-gray-700 rounded p-4 font-mono text-sm text-white resize-none focus:outline-none focus:border-blue-500 overflow-auto"
                                    spellCheck={false}
                                    placeholder="Write your solution here..."
                                />

                                <div className="mt-4">
                                    <button
                                        onClick={() => evaluateCode(codeContent)}
                                        disabled={isEvaluating}
                                        className="px-6 py-2.5 bg-green-600 hover:bg-green-700 disabled:bg-green-400 text-white rounded-lg text-sm font-medium transition-colors flex items-center gap-2"
                                    >
                                        {isEvaluating ? (
                                            <>
                                                <Loader2 className="w-4 h-4 animate-spin" />
                                                Analyzing with AI...
                                            </>
                                        ) : (
                                            '▶ Run Code'
                                        )}
                                    </button>
                                </div>
                            </div>

                            {/* Scoring Info Panel */}
                            <div className="w-56 bg-gray-900 p-4 border-l border-gray-700 rounded-r-lg flex flex-col gap-3 overflow-y-auto">
                                <div className="text-center pb-3 border-b border-gray-700">
                                    <span className="text-lg">📊</span>
                                    <h3 className="text-sm font-bold text-white mt-1">AI Scoring</h3>
                                </div>

                                <div className="bg-gray-800 rounded-lg p-3">
                                    <h4 className="text-xs font-semibold text-blue-400 mb-2">Score Weights</h4>
                                    <div className="space-y-1.5 text-xs">
                                        <div className="flex justify-between text-gray-300"><span>Logic</span><span className="text-blue-400">35%</span></div>
                                        <div className="flex justify-between text-gray-300"><span>Edge Cases</span><span className="text-blue-400">20%</span></div>
                                        <div className="flex justify-between text-gray-300"><span>Efficiency</span><span className="text-blue-400">20%</span></div>
                                        <div className="flex justify-between text-gray-300"><span>Readability</span><span className="text-blue-400">15%</span></div>
                                    </div>
                                </div>

                                <div className="bg-gray-800 rounded-lg p-3">
                                    <h4 className="text-xs font-semibold text-green-400 mb-2">Powered by Gemini AI</h4>
                                    <p className="text-xs text-gray-400">Your code is analyzed by AI for accurate feedback.</p>
                                </div>

                                <button onClick={() => setShowIDE(false)} className="mt-auto px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded text-sm font-medium">
                                    Close IDE
                                </button>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* AI Analysis Popup */}
            <AnimatePresence>
                {showAnalysis && evaluationResult && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="absolute inset-0 bg-black/90 backdrop-blur-md z-50 flex items-center justify-center p-4"
                    >
                        <motion.div
                            initial={{ scale: 0.8, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0.8, opacity: 0 }}
                            className="w-full max-w-2xl bg-gradient-to-br from-gray-900 to-gray-800 border border-gray-700 rounded-2xl p-6 shadow-2xl max-h-[85vh] overflow-y-auto"
                            onClick={(e) => e.stopPropagation()}
                        >
                            {/* Header */}
                            <div className="flex justify-between items-start mb-6">
                                <div>
                                    <h2 className="text-2xl font-bold text-white mb-1">AI Code Analysis</h2>
                                    <p className="text-sm text-gray-400">Powered by Gemini</p>
                                </div>
                            </div>

                            {/* Overall Score */}
                            <div className="flex items-center gap-6 mb-6 p-4 bg-black/30 rounded-xl">
                                <div className={`w-24 h-24 rounded-full flex items-center justify-center text-3xl font-bold border-4 ${evaluationResult.overallScore >= 70 ? 'border-green-500 text-green-400' :
                                    evaluationResult.overallScore >= 50 ? 'border-yellow-500 text-yellow-400' : 'border-red-500 text-red-400'
                                    }`}>
                                    {evaluationResult.overallScore}
                                </div>
                                <div>
                                    <div className={`text-xl font-semibold ${evaluationResult.overallScore >= 70 ? 'text-green-400' :
                                        evaluationResult.overallScore >= 50 ? 'text-yellow-400' : 'text-red-400'
                                        }`}>
                                        {evaluationResult.verdict}
                                    </div>
                                    <p className="text-gray-300 text-sm mt-1">{evaluationResult.summary}</p>
                                </div>
                            </div>

                            {/* Detailed Sections */}
                            {evaluationResult.sections && (
                                <div className="space-y-4">
                                    {evaluationResult.sections.map((section, index) => (
                                        <div key={index} className="bg-black/20 rounded-xl p-4 border border-gray-700/50">
                                            <div className="flex justify-between items-center mb-3">
                                                <h3 className="text-white font-semibold">{section.title}</h3>
                                                <div className={`px-3 py-1 rounded-full text-xs font-medium ${section.score >= 70 ? 'bg-green-500/20 text-green-400' :
                                                    section.score >= 50 ? 'bg-yellow-500/20 text-yellow-400' : 'bg-red-500/20 text-red-400'
                                                    }`}>
                                                    {section.score}/100
                                                </div>
                                            </div>
                                            <p className="text-gray-300 text-sm">{section.feedback}</p>
                                        </div>
                                    ))}
                                </div>
                            )}

                            {/* View Final Report Button */}
                            <button
                                onClick={handleCloseAnalysis}
                                className="w-full mt-6 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white rounded-xl font-medium transition-all"
                            >
                                View Final Report
                            </button>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
};

const ControlButton = ({ onClick, isActive, onIcon, offIcon, activeClass, inactiveClass }) => (
    <motion.button
        onClick={onClick}
        whileHover={{ scale: 1.1 }}
        whileTap={{ scale: 0.9 }}
        className={`w-14 h-14 rounded-full flex items-center justify-center transition-all duration-300 ${isActive ? activeClass : inactiveClass}`}
    >
        {isActive ? React.cloneElement(onIcon, { size: 24 }) : React.cloneElement(offIcon, { size: 24 })}
    </motion.button>
);

export default InterviewRoom;