# School Info - Avatar & File Manager Application

This is a Gradio-based web application that provides two main functionalities: an **Avatar Creation Tool** equipped with advanced face detection, and a **File Management System** to organize and handle your files locally.

## Features & Functionalities

### 📸 Avatar Creation (Left Column)
- **Webcam & Image Upload:** Capture a photo directly using your device's webcam or upload an existing image.
- **Robust Face Detection:** Integrates Google's **MediaPipe (Tasks API)** and OpenCV to ensure the image contains a clear, frontal human face. If no face is detected, it will prevent the avatar creation and display an error.
- **Automatic Model Download:** The required MediaPipe model (`blaze_face_short_range.tflite`) is automatically downloaded the first time you run the app.
- **Image Gallery:** Easily reuse previously processed avatars via a dropdown selector.

### 📂 File Management (Right Column)
- **Live File Dashboard:** View all files stored in the local `data/` directory through an interactive table displaying File Name, Type, and Last Modified Date.
- **Search & Filter:** Quickly find files by typing their names into the search bar.
- **Upload New Files:** Support for uploading multiple files at once. Allowed extensions are restricted to: `.pdf`, `.png`, `.jpg`, `.jpeg`, `.csv`, `.md`, and `.markdown`.
- **Update Existing Files:** Select a specific file from the dropdown and upload a new version to seamlessly replace it.
- **Delete Files:** Remove unwanted files from the local storage directly through the interface.

---

## 🚀 How to Initialize and Run the App

### Prerequisites
Make sure you have Python installed (Python 3.10 to 3.13 are supported). We recommend using `uv` or a standard python virtual environment for dependency management.

### Installation
1. Open your terminal and navigate to the application directory (`src/app-school-info`).
2. Install the required dependencies:

**Using standard pip:**
```bash
pip install -r requirements.txt
```

**Using uv (recommended):**
```bash
uv pip install -r requirements.txt
```

### Running the Application
Once the dependencies are installed, start the Gradio server by running:

```bash
python app.py
```
*(If you are using `uv`, run: `uv run python app.py`)*

After a few seconds, the terminal will output a local URL (usually `http://127.0.0.1:7860`). Open this URL in your web browser to use the app.

---

## 📖 How to Use

### Creating an Avatar
1. On the left side, click the image component to upload a photo or use the webcam to take a picture.
2. Click **"Create Avatar"**.
3. If a face is successfully detected, the image will be processed and saved into the `data/` directory.

### Managing Files
- **To upload completely new files:** Scroll down to the `Upload new files` section on the right, drag-and-drop your files, and they will appear in the table above.
- **To delete a file:** Select the file name from the `Select a file to manage` dropdown, then click **"Delete Selected"**.
- **To update/replace an existing file:** 
  1. Select the file you want to replace from the `Select a file to manage` dropdown.
  2. Upload your new file in the `Upload new version` box right below it.
  3. Click **"Update File"**.
