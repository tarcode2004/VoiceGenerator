# Voice Generator

A web application for generating audio from vocabulary lists using OpenAI's Text-to-Speech API.

## Features

- Extract vocabulary from PDF files using OCR
- Create and manage vocabulary lists
- Generate audio files from vocabulary lists
- Support for multiple languages (Dutch, Turkish, Russian)
- Manual text input for vocabulary extraction

## Setup

1. **Get an OpenAI API Key**
   - Visit [OpenAI API](https://platform.openai.com/api-keys)
   - Create a new API key
   - Make sure you have credits in your OpenAI account

2. **Run the Application**
   - Open `index.html` in your web browser
   - When prompted, enter your OpenAI API key
   - The API key will be stored in memory for the current session

## Usage

### Creating Vocabulary Lists

1. **From PDF Files**
   - Click "Upload PDF" and select a PDF file
   - Choose whether to include Russian translations
   - Enable OCR if the PDF contains images or scanned text
   - Click "Extract Vocabulary"

2. **Manual Input**
   - Click "Manual Input"
   - Paste or type your text
   - Click "Process Text"

3. **Manual Creation**
   - Click "Create New List"
   - Add vocabulary items manually
   - Save your list

### Generating Audio

1. Select a vocabulary list
2. Choose your preferred voices for each language
3. Set the number of items per audio file
4. Choose generation mode (parallel or sequential)
5. Click "Generate Audio"
6. Download the generated audio files

## Security

- API keys are never stored on disk
- API keys are only stored in browser memory during the session
- No sensitive data is sent to any server except OpenAI's API

## Requirements

- Modern web browser with JavaScript enabled
- OpenAI API key with credits
- Internet connection for API calls

## Troubleshooting

- **API Key Error**: Make sure your API key is valid and you have credits
- **PDF Extraction Issues**: Try enabling OCR for scanned documents
- **Audio Generation Fails**: Check your internet connection and API key validity

## File Structure

```
VoiceGenerator/
├── index.html          # Main application page
├── script.js           # Application logic
├── styles.css          # Styling
├── server.py           # Optional local server
├── package.json        # Dependencies (if using npm)
└── README.md           # This file
``` 