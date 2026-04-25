import gradio as gr
import cv2
import mediapipe as mp
import os
import pandas as pd
from datetime import datetime
import shutil

import urllib.request

# Configuration
DATA_DIR = os.path.join(os.path.dirname(__file__), "data")
ALLOWED_EXTENSIONS = {".pdf", ".png", ".jpg", ".jpeg", ".csv", ".md", ".markdown"}

# Ensure data directory exists
os.makedirs(DATA_DIR, exist_ok=True)

# MediaPipe Face Detection Initialization (New Tasks API)
from mediapipe.tasks import python
from mediapipe.tasks.python import vision

MODEL_PATH = os.path.join(DATA_DIR, "blaze_face_short_range.tflite")
if not os.path.exists(MODEL_PATH):
    print("Downloading MediaPipe face detection model...")
    urllib.request.urlretrieve(
        "https://storage.googleapis.com/mediapipe-models/face_detector/blaze_face_short_range/float16/1/blaze_face_short_range.tflite",
        MODEL_PATH
    )

base_options = python.BaseOptions(model_asset_path=MODEL_PATH)
options = vision.FaceDetectorOptions(base_options=base_options)
detector = vision.FaceDetector.create_from_options(options)

def is_frontal_face(image_path):
    if not image_path or not os.path.exists(image_path):
        return False
    
    try:
        # Load the input image from a file
        mp_image = mp.Image.create_from_file(image_path)
        
        # Detect faces in the input image
        detection_result = detector.detect(mp_image)
        
        # If detections are found, we assume a face is present
        if detection_result.detections:
            return True
        return False
    except Exception as e:
        print(f"Error in face detection: {e}")
        return False

def get_images():
    """Retrieve a list of image files from the data directory for the Dropdown."""
    images = []
    if not os.path.exists(DATA_DIR):
        return images
    
    for f in os.listdir(DATA_DIR):
        if f.lower().endswith(('.png', '.jpg', '.jpeg')):
            images.append(f)
    return sorted(images)

def process_avatar(image_path):
    if image_path is None:
        raise gr.Error("Please provide an image.")
    
    if not is_frontal_face(image_path):
        raise gr.Error("No frontal face detected. Please provide a clear frontal face image.")
    
    # Save the image to the data directory if it's not already there
    filename = os.path.basename(image_path)
    dest_path = os.path.join(DATA_DIR, filename)
    
    if image_path != dest_path:
        # Avoid file collision
        if os.path.exists(dest_path):
            base, ext = os.path.splitext(filename)
            timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
            dest_path = os.path.join(DATA_DIR, f"{base}_{timestamp}{ext}")
        shutil.copy2(image_path, dest_path)
    
    df, dropdown_choices = update_file_list()
    return dest_path, df, gr.update(choices=dropdown_choices), gr.update(choices=get_images())

# --- Right Column Logic ---
def get_file_list():
    """Returns a pandas DataFrame of files in the data directory."""
    files_data = []
    if os.path.exists(DATA_DIR):
        for f in os.listdir(DATA_DIR):
            if f == "blaze_face_short_range.tflite":
                continue
                
            file_path = os.path.join(DATA_DIR, f)
            if os.path.isfile(file_path):
                stat = os.stat(file_path)
                name, ext = os.path.splitext(f)
                
                # Optionally, only list allowed files or all except the model
                if ext.lower() not in ALLOWED_EXTENSIONS:
                    continue
                    
                mod_time = datetime.fromtimestamp(stat.st_mtime).strftime("%Y-%m-%d %H:%M:%S")
                files_data.append({
                    "Name": f,
                    "Type": ext.lower(),
                    "Date": mod_time
                })
    return pd.DataFrame(files_data, columns=["Name", "Type", "Date"])

def update_file_list(search_query=""):
    """Update the file list dataframe and dropdown choices based on a search query."""
    df = get_file_list()
    if search_query and not df.empty:
        df = df[df["Name"].str.contains(search_query, case=False, na=False)]
    
    file_names = df["Name"].tolist() if not df.empty else []
    return df, file_names

def is_allowed_file(filename):
    _, ext = os.path.splitext(filename)
    return ext.lower() in ALLOWED_EXTENSIONS

def handle_file_upload(files, search_query):
    if not files:
        df, choices = update_file_list(search_query)
        return df, gr.update(choices=choices)
        
    for file in files:
        if not is_allowed_file(file.name):
            raise gr.Error(f"File type not allowed: {os.path.basename(file.name)}. Allowed: pdf, png, jpg, csv, markdown")
            
        filename = os.path.basename(file.name)
        dest_path = os.path.join(DATA_DIR, filename)
        shutil.copy2(file.name, dest_path)
        
    df, choices = update_file_list(search_query)
    # Also update the images dropdown in the left column
    return df, gr.update(choices=choices), gr.update(choices=get_images())

def handle_update_file(selected_filename, new_file, search_query):
    if not selected_filename:
        raise gr.Error("No file selected to update.")
    if not new_file:
        raise gr.Error("Please upload a new file.")
        
    if not is_allowed_file(new_file.name):
        raise gr.Error("File type not allowed. Allowed: pdf, png, jpg, csv, markdown")
        
    # Delete old file
    old_file_path = os.path.join(DATA_DIR, selected_filename)
    if os.path.exists(old_file_path):
        os.remove(old_file_path)
        
    # Save new file
    filename = os.path.basename(new_file.name)
    dest_path = os.path.join(DATA_DIR, filename)
    shutil.copy2(new_file.name, dest_path)
    
    df, choices = update_file_list(search_query)
    return df, gr.update(choices=choices, value=None), gr.update(choices=get_images())

def delete_file(selected_filename, search_query):
    if not selected_filename:
        raise gr.Error("No file selected to delete.")
        
    file_path = os.path.join(DATA_DIR, selected_filename)
    if os.path.exists(file_path):
        os.remove(file_path)
        
    df, choices = update_file_list(search_query)
    return df, gr.update(choices=choices, value=None), gr.update(choices=get_images())

# --- UI Setup ---
with gr.Blocks(title="Avatar & File Manager", theme=gr.themes.Soft()) as demo:
    gr.Markdown("# School Info - Avatar & File Manager Application")
    
    with gr.Row():
        # LEFT COLUMN
        with gr.Column(scale=1):
            gr.Markdown("### 📸 Avatar Creation")
            avatar_input = gr.Image(sources=["upload", "webcam"], type="filepath", label="Capture or Upload Face")
            
            with gr.Accordion("Select from previous images", open=False):
                previous_images = gr.Dropdown(choices=get_images(), label="Previous images")
            
            create_btn = gr.Button("Create Avatar", variant="primary", size="lg")
            
            avatar_output = gr.Image(label="Processed Avatar", interactive=False)
            
        # RIGHT COLUMN
        with gr.Column(scale=1):
            gr.Markdown("### 📂 File Manager")
            
            with gr.Row():
                search_input = gr.Textbox(label="Filter Files by Name", placeholder="Type to search...", scale=3)
                refresh_btn = gr.Button("Refresh", scale=1)
                
            file_dataframe = gr.Dataframe(value=get_file_list(), headers=["Name", "Type", "Date"], interactive=False)
            
            gr.Markdown("#### Manage Files")
            with gr.Row():
                # Dropdown for selecting a file from the list
                initial_choices = get_file_list()["Name"].tolist() if not get_file_list().empty else []
                file_dropdown = gr.Dropdown(choices=initial_choices, label="Select a file to manage")
                delete_btn = gr.Button("Delete Selected", variant="stop")
                
            with gr.Group():
                gr.Markdown("Update selected file:")
                with gr.Row():
                    update_file_input = gr.File(label="Upload new version", file_count="single", scale=3)
                    update_btn = gr.Button("Update File", scale=1)
                
            with gr.Group():
                gr.Markdown("Upload new files (pdf, png, jpg, csv, markdown):")
                upload_new_files = gr.File(label="Upload Files", file_count="multiple")
                
    # --- Event Listeners ---
    
    # Avatar Creation
    create_btn.click(
        process_avatar,
        inputs=[avatar_input],
        outputs=[avatar_output, file_dataframe, file_dropdown, previous_images]
    )
    
    # Previous image selection logic
    def load_previous_image(img_filename):
        if img_filename:
            return os.path.join(DATA_DIR, img_filename)
        return None
        
    previous_images.change(load_previous_image, inputs=[previous_images], outputs=[avatar_input])
    
    # File Manager
    # Wrapper functions to handle multiple outputs and inputs correctly
    def on_search_change(query):
        df, choices = update_file_list(query)
        return df, gr.update(choices=choices)
        
    search_input.change(
        on_search_change,
        inputs=[search_input],
        outputs=[file_dataframe, file_dropdown]
    )
    
    refresh_btn.click(
        on_search_change,
        inputs=[search_input],
        outputs=[file_dataframe, file_dropdown]
    )
    
    upload_new_files.upload(
        handle_file_upload,
        inputs=[upload_new_files, search_input],
        outputs=[file_dataframe, file_dropdown, previous_images]
    )
    
    delete_btn.click(
        delete_file,
        inputs=[file_dropdown, search_input],
        outputs=[file_dataframe, file_dropdown, previous_images]
    )
    
    update_btn.click(
        handle_update_file,
        inputs=[file_dropdown, update_file_input, search_input],
        outputs=[file_dataframe, file_dropdown, previous_images]
    )

if __name__ == "__main__":
    demo.launch(share=True)
