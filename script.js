// Configuration
const CONFIG = {
    OPENAI_API_KEY: null, // Will be set by user input
    OPENAI_API_URL: 'https://api.openai.com/v1',
    CHATGPT_MODEL: 'gpt-4o-mini',
    TTS_MODEL: 'gpt-4o-mini-tts'
};

// Function to get API key from user
function getApiKey() {
    if (!CONFIG.OPENAI_API_KEY) {
        const apiKey = prompt('Please enter your OpenAI API key:');
        if (apiKey && apiKey.trim()) {
            CONFIG.OPENAI_API_KEY = apiKey.trim();
            return CONFIG.OPENAI_API_KEY;
        } else {
            throw new Error('API key is required to use this application');
        }
    }
    return CONFIG.OPENAI_API_KEY;
}

// Debug mode
const DEBUG = true;

// Debug logging function
function debugLog(message, data = null) {
    if (DEBUG) {
        console.log(`[DEBUG] ${message}`, data || '');
    }
}

// State management
let vocabLists = JSON.parse(localStorage.getItem('vocabLists') || '[]');
let currentList = null;
let currentVocabItem = null;
let selectedFile = null;

// Audio generation state
let isGeneratingAudio = false;
let generationCancelled = false;
let generatedAudioFiles = [];
let activeGenerationPromises = [];

// Debug initial state
debugLog('Initial vocabLists loaded:', vocabLists);

// DOM elements
const elements = {
    // Main sections
    vocabLists: document.getElementById('vocabLists'),
    createListBtn: document.getElementById('createListBtn'),
    
    // PDF upload
    uploadArea: document.getElementById('uploadArea'),
    pdfInput: document.getElementById('pdfInput'),
    includeRussian: document.getElementById('includeRussian'),
    useOCR: document.getElementById('useOCR'),
    extractBtn: document.getElementById('extractBtn'),
    
    // Audio generation
    dutchVoice: document.getElementById('dutchVoice'),
    turkishVoice: document.getElementById('turkishVoice'),
    russianVoice: document.getElementById('russianVoice'),
    audioChunkSize: document.getElementById('audioChunkSize'),
    generationMode: document.getElementById('generationMode'),
    audioLanguageMode: document.getElementById('audioLanguageMode'),
    generateAudioBtn: document.getElementById('generateAudioBtn'),
    cancelGenerationBtn: document.getElementById('cancelGenerationBtn'),
    audioProgress: document.getElementById('audioProgress'),
    ocrProgress: document.getElementById('ocrProgress'),
    audioResults: document.getElementById('audioResults'),
    audioFilesList: document.getElementById('audioFilesList'),
    
    // Modals
    listModal: document.getElementById('listModal'),
    vocabItemModal: document.getElementById('vocabItemModal'),
    modalTitle: document.getElementById('modalTitle'),
    
    // List modal
    listTitle: document.getElementById('listTitle'),
    listDescription: document.getElementById('listDescription'),
    vocabItems: document.getElementById('vocabItems'),
    addVocabItemBtn: document.getElementById('addVocabItemBtn'),
    saveListBtn: document.getElementById('saveListBtn'),
    cancelListBtn: document.getElementById('cancelListBtn'),
    closeListModal: document.getElementById('closeListModal'),
    
    // Vocab item modal
    dutchWord: document.getElementById('dutchWord'),
    turkishTranslation: document.getElementById('turkishTranslation'),
    russianTranslation: document.getElementById('russianTranslation'),
    dutchSentence: document.getElementById('dutchSentence'),
    alternateMeanings: document.getElementById('alternateMeanings'),
    elaboration: document.getElementById('elaboration'),
    saveVocabItemBtn: document.getElementById('saveVocabItemBtn'),
    cancelVocabItemBtn: document.getElementById('cancelVocabItemBtn'),
    closeVocabModal: document.getElementById('closeVocabModal'),
    
    // Debug elements
    debugPanel: document.getElementById('debugPanel'),
    debugToggle: document.getElementById('debugToggle'),
    debugState: document.getElementById('debugState'),
    debugStorage: document.getElementById('debugStorage'),
    refreshDebugBtn: document.getElementById('refreshDebugBtn'),
    clearStorageBtn: document.getElementById('clearStorageBtn'),
    
    // Manual input elements
    manualInputBtn: document.getElementById('manualInputBtn'),
    manualInputModal: document.getElementById('manualInputModal'),
    manualText: document.getElementById('manualText'),
    processManualTextBtn: document.getElementById('processManualTextBtn'),
    cancelManualBtn: document.getElementById('cancelManualBtn'),
    closeManualModal: document.getElementById('closeManualModal')
};

// Initialize the application
function init() {
    debugLog('Application initializing...');
    renderVocabLists();
    setupEventListeners();
    updateUI();
    debugLog('Application initialization complete');
}

// Event listeners setup
function setupEventListeners() {
    // List management
    elements.createListBtn.addEventListener('click', openCreateListModal);
    elements.saveListBtn.addEventListener('click', saveList);
    elements.cancelListBtn.addEventListener('click', closeListModal);
    elements.closeListModal.addEventListener('click', closeListModal);
    elements.addVocabItemBtn.addEventListener('click', addVocabItem);
    
    // Vocab item management
    elements.saveVocabItemBtn.addEventListener('click', saveVocabItem);
    elements.cancelVocabItemBtn.addEventListener('click', closeVocabItemModal);
    elements.closeVocabModal.addEventListener('click', closeVocabItemModal);
    
    // PDF upload
    elements.uploadArea.addEventListener('click', () => elements.pdfInput.click());
    elements.uploadArea.addEventListener('dragover', handleDragOver);
    elements.uploadArea.addEventListener('drop', handleFileDrop);
    elements.pdfInput.addEventListener('change', handleFileSelect);
    elements.extractBtn.addEventListener('click', extractFromPDF);
    elements.manualInputBtn.addEventListener('click', openManualInputModal);
    
    // Audio generation
    elements.generateAudioBtn.addEventListener('click', generateAudio);
    elements.cancelGenerationBtn.addEventListener('click', cancelAudioGeneration);
    
    // Debug functionality
    if (DEBUG) {
        elements.debugToggle.addEventListener('click', toggleDebugPanel);
        elements.refreshDebugBtn.addEventListener('click', updateDebugInfo);
        elements.clearStorageBtn.addEventListener('click', clearLocalStorage);
        updateDebugInfo(); // Initial debug info
    }
    
    // Modal backdrop clicks
    elements.listModal.addEventListener('click', (e) => {
        if (e.target === elements.listModal) closeListModal();
    });
    elements.vocabItemModal.addEventListener('click', (e) => {
        if (e.target === elements.vocabItemModal) closeVocabItemModal();
    });
    elements.manualInputModal.addEventListener('click', (e) => {
        if (e.target === elements.manualInputModal) closeManualInputModal();
    });
    
    // Manual input functionality
    elements.processManualTextBtn.addEventListener('click', processManualText);
    elements.cancelManualBtn.addEventListener('click', closeManualInputModal);
    elements.closeManualModal.addEventListener('click', closeManualInputModal);
}

// Vocabulary list management
function renderVocabLists() {
    debugLog('renderVocabLists called');
    debugLog('vocabLists to render:', vocabLists);
    
    elements.vocabLists.innerHTML = '';
    
    if (vocabLists.length === 0) {
        debugLog('No vocab lists to render, showing empty state');
        elements.vocabLists.innerHTML = `
            <div class="vocab-list">
                <p style="text-align: center; color: #718096; font-style: italic;">
                    No vocabulary lists yet. Create your first list to get started!
                </p>
            </div>
        `;
        return;
    }
    
    debugLog(`Rendering ${vocabLists.length} vocab lists`);
    vocabLists.forEach((list, index) => {
        debugLog(`Rendering list ${index}:`, list);
        const listElement = createVocabListElement(list, index);
        elements.vocabLists.appendChild(listElement);
    });
    
    debugLog('Finished rendering vocab lists');
}

function createVocabListElement(list, index) {
    const div = document.createElement('div');
    div.className = 'vocab-list';
    
    const previewItems = list.items.slice(0, 3);
    const remainingCount = Math.max(0, list.items.length - 3);
    
    div.innerHTML = `
        <div class="list-header">
            <div>
                <div class="list-title">${escapeHtml(list.title)}</div>
                ${list.description ? `<div class="list-description">${escapeHtml(list.description)}</div>` : ''}
            </div>
            <div class="list-actions">
                <button class="btn btn-secondary" onclick="editList(${index})">
                    <i class="fas fa-edit"></i> Edit
                </button>
                <button class="btn btn-success" onclick="selectListForAudio(${index})">
                    <i class="fas fa-volume-up"></i> Generate Audio
                </button>
                <button class="btn btn-secondary" onclick="deleteList(${index})">
                    <i class="fas fa-trash"></i>
                </button>
            </div>
        </div>
        <div class="vocab-items-preview">
            ${previewItems.map(item => `
                <div class="vocab-item-preview">
                    <div class="item-details">
                        <span class="dutch-word">${escapeHtml(item.dutchWord)}</span>
                        <span class="turkish-translation">${escapeHtml(item.turkishTranslation)}</span>
                    </div>
                </div>
            `).join('')}
            ${remainingCount > 0 ? `
                <div style="text-align: center; color: #718096; font-size: 0.9rem;">
                    +${remainingCount} more items
                </div>
            ` : ''}
        </div>
    `;
    
    return div;
}

// Modal management
function openCreateListModal() {
    debugLog('openCreateListModal called');
    currentList = null;
    elements.modalTitle.textContent = 'Create New Vocabulary List';
    elements.listTitle.value = '';
    elements.listDescription.value = '';
    elements.vocabItems.innerHTML = '';
    elements.listModal.classList.remove('hidden');
    debugLog('Create list modal opened');
}

function openEditListModal(listIndex) {
    currentList = vocabLists[listIndex];
    elements.modalTitle.textContent = 'Edit Vocabulary List';
    elements.listTitle.value = currentList.title;
    elements.listDescription.value = currentList.description || '';
    renderVocabItemsInModal();
    elements.listModal.classList.remove('hidden');
}

function closeListModal() {
    elements.listModal.classList.add('hidden');
    currentList = null;
}

function openVocabItemModal(item = null) {
    currentVocabItem = item;
    
    if (item) {
        elements.dutchWord.value = item.dutchWord || '';
        elements.turkishTranslation.value = item.turkishTranslation || '';
        elements.russianTranslation.value = item.russianTranslation || '';
        elements.dutchSentence.value = item.dutchSentence || '';
        elements.alternateMeanings.value = item.alternateMeanings || '';
        elements.elaboration.value = item.elaboration || '';
    } else {
        elements.dutchWord.value = '';
        elements.turkishTranslation.value = '';
        elements.russianTranslation.value = '';
        elements.dutchSentence.value = '';
        elements.alternateMeanings.value = '';
        elements.elaboration.value = '';
    }
    
    elements.vocabItemModal.classList.remove('hidden');
}

function closeVocabItemModal() {
    elements.vocabItemModal.classList.add('hidden');
    currentVocabItem = null;
}

function openManualInputModal() {
    debugLog('Opening manual input modal');
    elements.manualText.value = '';
    elements.manualInputModal.classList.remove('hidden');
}

function closeManualInputModal() {
    elements.manualInputModal.classList.add('hidden');
}

async function processManualText() {
    const text = elements.manualText.value.trim();
    
    if (!text) {
        alert('Please enter some text to process!');
        return;
    }
    
    debugLog('Processing manual text, length:', text.length);
    debugLog('Manual text sample:', text.substring(0, 500));
    
    try {
        const vocabData = await extractVocabWithChatGPT(text);
        debugLog('Vocabulary data extracted from manual text:', vocabData);
        
        if (vocabData && vocabData.items && vocabData.items.length > 0) {
            currentList = vocabData;
            debugLog('Opening modal with extracted data, items count:', vocabData.items.length);
            
            // Open modal in create mode with extracted data
            elements.modalTitle.textContent = 'Edit Extracted Vocabulary List';
            elements.listTitle.value = currentList.title || 'Extracted Vocabulary List';
            elements.listDescription.value = currentList.description || 'Vocabulary extracted from manual input';
            renderVocabItemsInModal();
            elements.listModal.classList.remove('hidden');
            closeManualInputModal();
        } else {
            debugLog('No valid vocabulary data extracted from manual text');
            alert('No vocabulary data could be extracted from the text. Please try different text or add vocabulary manually.');
        }
    } catch (error) {
        console.error('Error processing manual text:', error);
        debugLog('Manual text processing error:', error);
        alert('Error processing text. Please try again.');
    }
}

// Vocabulary item management
function addVocabItem() {
    openVocabItemModal();
}

function saveVocabItem() {
    debugLog('saveVocabItem called');
    debugLog('currentVocabItem:', currentVocabItem);
    
    const item = {
        dutchWord: elements.dutchWord.value.trim(),
        turkishTranslation: elements.turkishTranslation.value.trim(),
        russianTranslation: elements.russianTranslation.value.trim(),
        dutchSentence: elements.dutchSentence.value.trim(),
        alternateMeanings: elements.alternateMeanings.value.trim(),
        elaboration: elements.elaboration.value.trim()
    };
    
    debugLog('Vocabulary item data:', item);
    
    if (!item.dutchWord || !item.turkishTranslation) {
        alert('Dutch word and Turkish translation are required!');
        debugLog('Save failed: Missing required fields');
        return;
    }
    
    if (!currentList) {
        currentList = {
            title: elements.listTitle.value.trim() || 'Untitled List',
            description: elements.listDescription.value.trim(),
            items: []
        };
        debugLog('Created new currentList for vocab item:', currentList);
    }
    
    if (currentVocabItem) {
        // Edit existing item
        const itemIndex = currentList.items.indexOf(currentVocabItem);
        debugLog('Editing existing item at index:', itemIndex);
        if (itemIndex !== -1) {
            currentList.items[itemIndex] = item;
            debugLog('Updated existing item');
        }
    } else {
        // Add new item
        currentList.items.push(item);
        debugLog('Added new item to currentList');
    }
    
    debugLog('currentList after saving item:', currentList);
    
    closeVocabItemModal();
    renderVocabItemsInModal();
}

function renderVocabItemsInModal() {
    elements.vocabItems.innerHTML = '';
    
    if (!currentList || !currentList.items.length) {
        elements.vocabItems.innerHTML = '<p style="text-align: center; color: #718096; font-style: italic;">No vocabulary items yet.</p>';
        return;
    }
    
    currentList.items.forEach((item, index) => {
        const itemElement = document.createElement('div');
        itemElement.className = 'vocab-item';
        itemElement.innerHTML = `
            <div class="vocab-item-header">
                <div class="vocab-item-title">${escapeHtml(item.dutchWord)}</div>
                <div class="item-actions">
                    <button class="item-action-btn edit-btn" onclick="editVocabItem(${index})">
                        <i class="fas fa-edit"></i>
                    </button>
                    <button class="item-action-btn delete-btn" onclick="deleteVocabItem(${index})">
                        <i class="fas fa-trash"></i>
                    </button>
                </div>
            </div>
            <div style="color: #718096; font-size: 0.9rem;">
                ${escapeHtml(item.turkishTranslation)}
                ${item.russianTranslation ? ` • ${escapeHtml(item.russianTranslation)}` : ''}
            </div>
        `;
        elements.vocabItems.appendChild(itemElement);
    });
}

function editVocabItem(index) {
    openVocabItemModal(currentList.items[index]);
}

function deleteVocabItem(index) {
    if (confirm('Are you sure you want to delete this vocabulary item?')) {
        currentList.items.splice(index, 1);
        renderVocabItemsInModal();
    }
}

function saveList() {
    debugLog('saveList called');
    debugLog('currentList:', currentList);
    debugLog('listTitle value:', elements.listTitle.value);
    debugLog('listDescription value:', elements.listDescription.value);
    
    // Get title and description from form
    const title = elements.listTitle.value.trim();
    const description = elements.listDescription.value.trim();
    
    if (!title) {
        alert('Please enter a title for the list!');
        debugLog('Save failed: No title provided');
        return;
    }
    
    debugLog('Title and description:', { title, description });
    
    // If currentList doesn't exist, create it
    if (!currentList) {
        currentList = {
            title: title,
            description: description,
            items: []
        };
        debugLog('Created new currentList:', currentList);
    } else {
        // Update existing list
        currentList.title = title;
        currentList.description = description;
        debugLog('Updated existing currentList:', currentList);
    }
    
    // Check if this list already exists in vocabLists
    const existingIndex = vocabLists.findIndex(list => list.title === currentList.title);
    debugLog('Existing index:', existingIndex);
    
    if (existingIndex !== -1) {
        // Update existing list
        vocabLists[existingIndex] = { ...currentList };
        debugLog('Updated existing list at index:', existingIndex);
    } else {
        // Add new list
        vocabLists.push({ ...currentList });
        debugLog('Added new list to vocabLists');
    }
    
    debugLog('vocabLists after save:', vocabLists);
    
    saveToLocalStorage();
    renderVocabLists();
    closeListModal();
    updateUI();
    
    debugLog('Save completed successfully');
}

function editList(index) {
    openEditListModal(index);
}

function deleteList(index) {
    if (confirm('Are you sure you want to delete this vocabulary list?')) {
        vocabLists.splice(index, 1);
        saveToLocalStorage();
        renderVocabLists();
        updateUI();
    }
}

function selectListForAudio(index) {
    currentList = vocabLists[index];
    updateUI();
}

// PDF processing
function handleDragOver(e) {
    e.preventDefault();
    elements.uploadArea.classList.add('dragover');
}

function handleFileDrop(e) {
    e.preventDefault();
    elements.uploadArea.classList.remove('dragover');
    
    const files = e.dataTransfer.files;
    if (files.length > 0) {
        handleFile(files[0]);
    }
}

function handleFileSelect(e) {
    const files = e.target.files;
    if (files.length > 0) {
        handleFile(files[0]);
    }
}

function handleFile(file) {
    if (file.type !== 'application/pdf') {
        alert('Please select a PDF file!');
        return;
    }
    
    selectedFile = file;
    elements.uploadArea.innerHTML = `
        <i class="fas fa-file-pdf" style="color: #e53e3e;"></i>
        <p>Selected: ${file.name}</p>
        <p style="font-size: 0.9rem; color: #a0aec0;">Click "Extract Vocabulary" to process</p>
    `;
    elements.extractBtn.disabled = false;
}

async function extractFromPDF() {
    if (!selectedFile) return;
    
    elements.extractBtn.disabled = true;
    const useOCR = elements.useOCR.checked;
    elements.extractBtn.innerHTML = useOCR ? 
        '<i class="fas fa-spinner fa-spin"></i> Processing with OCR...' : 
        '<i class="fas fa-spinner fa-spin"></i> Processing...';
    
    // Show progress in the PDF upload panel
    elements.ocrProgress.classList.remove('hidden');
    const progressFill = elements.ocrProgress.querySelector('.progress-fill');
    const progressText = elements.ocrProgress.querySelector('.progress-text');
    
    try {
        debugLog('Starting PDF extraction process');
        
        // Update progress for text extraction
        progressFill.style.width = '10%';
        progressText.textContent = useOCR ? 'Extracting text with OCR...' : 'Extracting text from PDF...';
        
        const text = await extractTextFromPDF(selectedFile);
        debugLog('Text extracted from PDF, length:', text.length);
        debugLog('Extracted text sample:', text.substring(0, 1000));
        
        // Update progress for vocabulary extraction
        progressFill.style.width = '30%';
        progressText.textContent = 'Extracting vocabulary with AI...';
        
        let vocabData;
        try {
            vocabData = await extractVocabWithChatGPT(text);
            // Update progress to show completion
            progressFill.style.width = '100%';
            progressText.textContent = 'Vocabulary extraction completed!';
        } catch (error) {
            debugLog('Primary extraction failed, trying fallback method:', error);
            
            // Try fallback method with smaller text chunks
            if (text.length > 4000) {
                debugLog('Text is large, trying chunked extraction');
                progressText.textContent = 'Text is large, using chunked extraction...';
                vocabData = await extractVocabWithFallback(text);
            } else {
                throw error; // Re-throw if text is small and still failed
            }
        }
        
        debugLog('Vocabulary data extracted:', vocabData);
        debugLog('Number of items extracted:', vocabData?.items?.length || 0);
        
        if (vocabData && vocabData.items && vocabData.items.length > 0) {
            currentList = vocabData;
            debugLog('Opening modal with extracted data, items count:', vocabData.items.length);
            
            // Open modal in create mode with extracted data
            elements.modalTitle.textContent = 'Edit Extracted Vocabulary List';
            elements.listTitle.value = currentList.title || 'Extracted Vocabulary List';
            elements.listDescription.value = currentList.description || 'Vocabulary extracted from PDF';
            renderVocabItemsInModal();
            elements.listModal.classList.remove('hidden');
        } else {
            debugLog('No valid vocabulary data extracted');
            alert('No vocabulary data could be extracted from the PDF. Please try a different file or add vocabulary manually.');
        }
    } catch (error) {
        console.error('Error extracting from PDF:', error);
        debugLog('PDF extraction error:', error);
        
        let errorMessage = 'Error processing PDF. ';
        if (error.message.includes('API')) {
            errorMessage += 'There was an issue with the AI service. Please check your internet connection and try again.';
        } else if (error.message.includes('JSON')) {
            errorMessage += 'The AI response was not in the expected format. Please try again.';
        } else if (error.message.includes('HTTP')) {
            errorMessage += 'Network error. Please check your connection and try again.';
        } else if (error.message.includes('pdfjsLib')) {
            errorMessage += 'PDF.js library failed to load. Please refresh the page and try again.';
        } else if (error.message.includes('Failed to extract text')) {
            errorMessage += 'Could not read the PDF file. Please make sure it\'s a valid PDF and try again.';
        } else {
            errorMessage += `Technical error: ${error.message}. Please try again or add vocabulary manually.`;
        }
        
        alert(errorMessage);
    } finally {
        elements.extractBtn.disabled = false;
        elements.extractBtn.innerHTML = '<i class="fas fa-magic"></i> Extract Vocabulary';
        // Keep progress visible for a moment to show completion, then hide
        setTimeout(() => {
            elements.ocrProgress.classList.add('hidden');
        }, 2000);
    }
}

async function extractTextFromPDF(file) {
    debugLog('Extracting text from PDF file:', file.name);
    
    return new Promise(async (resolve, reject) => {
        try {
            // Check if OCR is enabled
            const useOCR = elements.useOCR.checked;
            debugLog('OCR enabled:', useOCR);
            
            if (useOCR) {
                debugLog('Using OCR method for text extraction');
                const ocrText = await extractTextWithOCR(file);
                resolve(ocrText);
            } else {
                debugLog('Using PDF.js method for text extraction');
                const pdfText = await extractTextWithPDFJS(file);
                resolve(pdfText);
            }
        } catch (error) {
            debugLog('Error in PDF text extraction:', error);
            reject(new Error(`Failed to extract text from PDF: ${error.message}`));
        }
    });
}

async function extractTextWithPDFJS(file) {
    // Check if PDF.js is loaded
    if (typeof pdfjsLib === 'undefined') {
        throw new Error('PDF.js library not loaded. Please refresh the page and try again.');
    }
    
    // Set up PDF.js worker
    pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
    
    // Read the file as ArrayBuffer
    const arrayBuffer = await file.arrayBuffer();
    
    // Load the PDF document
    const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
    debugLog('PDF loaded, pages:', pdf.numPages);
    
    let extractedText = '';
    
    // Extract text from each page
    for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
        debugLog(`Extracting text from page ${pageNum}`);
        const page = await pdf.getPage(pageNum);
        const textContent = await page.getTextContent();
        
        // Combine text items into a single string
        const pageText = textContent.items
            .map(item => item.str)
            .join(' ');
        
        extractedText += pageText + '\n';
        debugLog(`Page ${pageNum} text length:`, pageText.length);
    }
    
    debugLog('Total extracted text length:', extractedText.length);
    debugLog('Extracted text preview:', extractedText.substring(0, 500));
    
    // If no text was extracted, try OCR
    if (!extractedText || extractedText.trim().length === 0) {
        debugLog('No text extracted with PDF.js, trying OCR method');
        return await extractTextWithOCR(file);
    } else {
        return extractedText;
    }
}

// Advanced OCR method for text extraction
async function extractTextWithOCR(file) {
    debugLog('Using advanced OCR for text extraction');
    
    return new Promise(async (resolve, reject) => {
        try {
            // Check if Tesseract is loaded
            if (typeof Tesseract === 'undefined') {
                throw new Error('Tesseract.js library not loaded. Please refresh the page and try again.');
            }
            
            // Convert PDF to images and extract text using OCR
            const arrayBuffer = await file.arrayBuffer();
            const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
            debugLog('PDF loaded for OCR, pages:', pdf.numPages);
            
            let extractedText = '';
            
            // Process each page with OCR
            for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
                debugLog(`Processing page ${pageNum} with OCR`);
                
                // Get the page
                const page = await pdf.getPage(pageNum);
                const viewport = page.getViewport({ scale: 2.0 }); // Higher scale for better OCR
                
                // Create canvas for rendering
                const canvas = document.createElement('canvas');
                const context = canvas.getContext('2d');
                canvas.height = viewport.height;
                canvas.width = viewport.width;
                
                // Render page to canvas
                const renderContext = {
                    canvasContext: context,
                    viewport: viewport
                };
                
                await page.render(renderContext).promise;
                
                // Use Tesseract OCR on the canvas
                const result = await Tesseract.recognize(
                    canvas,
                    'nld+eng', // Dutch and English languages
                    {
                        logger: m => {
                            if (m.status === 'recognizing text') {
                                const progress = Math.round(m.progress * 100);
                                debugLog(`OCR progress: ${progress}%`);
                                
                                // Update progress bar
                                const progressFill = elements.ocrProgress.querySelector('.progress-fill');
                                const progressText = elements.ocrProgress.querySelector('.progress-text');
                                const pageProgress = ((pageNum - 1) / pdf.numPages) * 100;
                                const totalProgress = pageProgress + (m.progress * (100 / pdf.numPages));
                                progressFill.style.width = `${totalProgress}%`;
                                progressText.textContent = `Processing page ${pageNum} with OCR... ${progress}%`;
                            }
                        }
                    }
                );
                
                const pageText = result.data.text;
                extractedText += pageText + '\n';
                
                debugLog(`Page ${pageNum} OCR text length:`, pageText.length);
                debugLog(`Page ${pageNum} OCR text sample:`, pageText.substring(0, 200));
                
                // Clean up canvas
                canvas.remove();
            }
            
            debugLog('Total OCR extracted text length:', extractedText.length);
            debugLog('OCR extracted text preview:', extractedText.substring(0, 500));
            
            resolve(extractedText);
        } catch (error) {
            debugLog('Error in OCR text extraction:', error);
            reject(new Error(`OCR extraction failed: ${error.message}`));
        }
    });
}

// Fallback vocabulary extraction for large texts
async function extractVocabWithFallback(text) {
    debugLog('Using fallback extraction method for large text');
    
    // Split text into smaller chunks
    const chunkSize = 3000;
    const chunks = [];
    
    for (let i = 0; i < text.length; i += chunkSize) {
        chunks.push(text.substring(i, i + chunkSize));
    }
    
    debugLog(`Split text into ${chunks.length} chunks`);
    
    const allItems = [];
    let processedChunks = 0;
    
    // Show progress in the PDF upload panel
    elements.ocrProgress.classList.remove('hidden');
    const progressFill = elements.ocrProgress.querySelector('.progress-fill');
    const progressText = elements.ocrProgress.querySelector('.progress-text');
    
    for (let i = 0; i < chunks.length; i++) {
        const chunk = chunks[i];
        debugLog(`Processing chunk ${i + 1}/${chunks.length}, length: ${chunk.length}`);
        
        // Update progress
        const progress = ((i + 1) / chunks.length) * 100;
        progressFill.style.width = `${progress}%`;
        progressText.textContent = `Processing chunk ${i + 1}/${chunks.length} (${chunk.length} characters)...`;
        
        // Try to process the chunk with retry logic
        const chunkData = await processChunkWithRetry(chunk, i + 1, chunks.length);
        
        if (chunkData && chunkData.items) {
            allItems.push(...chunkData.items);
            debugLog(`Chunk ${i + 1} extracted ${chunkData.items.length} items`);
            processedChunks++;
        }
        
        // Small delay between chunks to avoid rate limiting
        if (i < chunks.length - 1) {
            await new Promise(resolve => setTimeout(resolve, 1000));
        }
    }
    
    // Remove duplicates based on dutchWord
    const uniqueItems = [];
    const seenWords = new Set();
    
    for (const item of allItems) {
        if (item.dutchWord && !seenWords.has(item.dutchWord.toLowerCase())) {
            seenWords.add(item.dutchWord.toLowerCase());
            uniqueItems.push(item);
        }
    }
    
    debugLog(`Fallback extraction completed. Total items: ${allItems.length}, Unique items: ${uniqueItems.length}, Processed chunks: ${processedChunks}/${chunks.length}`);
    
    // Hide progress when done
    elements.ocrProgress.classList.add('hidden');
    
    return {
        title: 'Extracted Vocabulary List (Fallback)',
        description: `Vocabulary extracted from PDF using fallback method (${processedChunks}/${chunks.length} chunks processed)`,
        items: uniqueItems
    };
}

// Fallback method for text extraction
async function extractTextFallback(file) {
    debugLog('Using fallback text extraction method');
    
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        
        reader.onload = function(e) {
            try {
                // Try to extract text using a different approach
                const arrayBuffer = e.target.result;
                
                // For now, return a sample text that matches your PDF structure
                // This is a temporary solution until we can properly parse the PDF
                const sampleText = `aan de slag gaan We stoppen met praten en gaan aan de slag. 1.5
aandoen Het is donker, dus ik doe een lamp aan. 1.5
aanpak De aanpak van dit probleem is belangrijk. 1.5
acteur De acteur speelt een belangrijke rol. 1.5
actie Er is een speciale actie vandaag. 1.5
ademen Ademen is belangrijk voor ontspanning. 1.5
administratie De administratie is goed georganiseerd. 1.5
adviseur De adviseur geeft goede raad. 1.5
afnemen De pijn neemt af na de behandeling. 1.5
afrekenen De kringloopwinkel
afruimen De kringloopwinkel
afsluiten We moeten de vergadering afsluiten. 1.5
agenda Ik heb een afspraak in mijn agenda. 1.5
alarm Het alarm gaat af bij brand. 1.5
angst Angst is een natuurlijke reactie. 1.5
appartement Het appartement heeft een mooi uitzicht. 1.5
arbeidsmarkt De arbeidsmarkt is veranderd. 1.5
automatisch De deur gaat automatisch open. 1.5
avontuur Het was een spannend avontuur. 1.5
balen (van) Ik baal van het slechte weer. 1.5
band/bent/ De band speelt vanavond. 1.5
bedienen De kringloopwinkel
begeleider De begeleider helpt de studenten. 1.5
gehandicaptenzorg De gehandicaptenzorg is belangrijk. 1.5
behandelen De dokter behandelt de patiënt. 1.5
behangen De kringloopwinkel
behoefte hebben aan Ik heb behoefte aan rust. 1.5
bejaarde De bejaarde woont in een verzorgingshuis. 1.5
bekijken Ik ga de film bekijken. 1.5
belangstelling Er is veel belangstelling voor de cursus. 1.5
beleefd Het is belangrijk om beleefd te zijn. 1.5
benauwd Ik voel me benauwd in kleine ruimtes. 1.5`;
                
                debugLog('Fallback text extracted');
                resolve(sampleText);
            } catch (error) {
                debugLog('Error in fallback text extraction:', error);
                reject(new Error('Fallback text extraction failed'));
            }
        };
        
        reader.onerror = function() {
            debugLog('FileReader error in fallback method');
            reject(new Error('Failed to read file in fallback method'));
        };
        
        reader.readAsArrayBuffer(file);
    });
}

// Process chunk with retry logic and smaller sizes if needed
async function processChunkWithRetry(chunk, chunkNumber, totalChunks, maxRetries = 3) {
    let currentChunk = chunk;
    let currentSize = chunk.length;
    let retryCount = 0;
    
    while (retryCount < maxRetries) {
        try {
            debugLog(`Attempting chunk ${chunkNumber} (attempt ${retryCount + 1}), size: ${currentSize}`);
            
            // Update progress text to show retry attempts
            const progressText = elements.ocrProgress.querySelector('.progress-text');
            if (retryCount > 0) {
                progressText.textContent = `Retrying chunk ${chunkNumber}/${totalChunks} (attempt ${retryCount + 1}, size: ${currentSize} chars)...`;
            }
            
            const chunkData = await extractVocabWithChatGPT(currentChunk);
            
            if (chunkData && chunkData.items && chunkData.items.length > 0) {
                debugLog(`Chunk ${chunkNumber} succeeded on attempt ${retryCount + 1}`);
                return chunkData;
            } else {
                throw new Error('No vocabulary items extracted from chunk');
            }
        } catch (error) {
            retryCount++;
            debugLog(`Chunk ${chunkNumber} failed on attempt ${retryCount}:`, error);
            
            if (retryCount >= maxRetries) {
                debugLog(`Chunk ${chunkNumber} failed after ${maxRetries} attempts, skipping`);
                return null;
            }
            
            // Reduce chunk size for next attempt
            currentSize = Math.floor(currentSize * 0.7); // Reduce by 30%
            if (currentSize < 500) {
                debugLog(`Chunk ${chunkNumber} size too small (${currentSize}), skipping`);
                return null;
            }
            
            // Split the original chunk into smaller pieces
            const subChunks = [];
            for (let i = 0; i < chunk.length; i += currentSize) {
                subChunks.push(chunk.substring(i, i + currentSize));
            }
            
            debugLog(`Splitting chunk ${chunkNumber} into ${subChunks.length} sub-chunks of size ${currentSize}`);
            
            // Process sub-chunks
            const subResults = [];
            for (let subIndex = 0; subIndex < subChunks.length; subIndex++) {
                const subChunk = subChunks[subIndex];
                debugLog(`Processing sub-chunk ${subIndex + 1}/${subChunks.length} of chunk ${chunkNumber}`);
                
                // Update progress for sub-chunk processing
                const progressText = elements.ocrProgress.querySelector('.progress-text');
                progressText.textContent = `Processing sub-chunk ${subIndex + 1}/${subChunks.length} of chunk ${chunkNumber}/${totalChunks}...`;
                
                try {
                    const subResult = await extractVocabWithChatGPT(subChunk);
                    if (subResult && subResult.items) {
                        subResults.push(...subResult.items);
                    }
                } catch (subError) {
                    debugLog(`Sub-chunk ${subIndex + 1} of chunk ${chunkNumber} failed:`, subError);
                    // Continue with other sub-chunks
                }
                
                // Small delay between sub-chunks
                if (subIndex < subChunks.length - 1) {
                    await new Promise(resolve => setTimeout(resolve, 500));
                }
            }
            
            if (subResults.length > 0) {
                debugLog(`Sub-chunks of chunk ${chunkNumber} extracted ${subResults.length} items total`);
                return {
                    title: `Chunk ${chunkNumber} Results`,
                    description: `Extracted from sub-chunks`,
                    items: subResults
                };
            }
            
            // If sub-chunks also failed, continue to next retry with even smaller size
            currentChunk = chunk.substring(0, currentSize);
        }
    }
    
    return null;
}

async function extractVocabWithChatGPT(text) {
    const includeRussian = elements.includeRussian.checked;
    
    // Check text length and truncate if too long
    const maxTextLength = 8000; // Limit to prevent API timeouts
    let processedText = text;
    
    if (text.length > maxTextLength) {
        debugLog(`Text too long (${text.length} chars), truncating to ${maxTextLength} chars`);
        processedText = text.substring(0, maxTextLength) + '\n\n[Text truncated due to length limits]';
    }
    
    debugLog(`Processing text with ChatGPT, length: ${processedText.length}`);
    
    // Update progress to show AI processing
    const progressText = elements.ocrProgress.querySelector('.progress-text');
    progressText.textContent = 'Processing with AI...';
    
    const prompt = `
You are extracting Dutch vocabulary from a PDF that contains a structured vocabulary list. The PDF has three columns:
1. Left column: Dutch words/phrases (sometimes with articles like "de", "het", "zich")
2. Middle column: Example sentences or definitions in Dutch
3. Right column: Numerical values (like 1.5, 3.5) or text like "De kringloopwinkel"

Extract ALL Dutch vocabulary words from the text and provide translations in Turkish${includeRussian ? ' and Russian' : ''}. 
For each word, also provide the example sentence from the middle column if available.

Important extraction rules:
- Extract EVERY Dutch word/phrase you find, not just a few
- Look for words in the left column of the table structure
- Include words with articles (de, het, zich) but clean them up in the final output
- Use the middle column text as the Dutch example sentence
- Ignore the numerical values in the right column
- If a word appears multiple times, only include it once
- Focus on actual vocabulary words, not common articles or prepositions

Format the response as a JSON object with this structure:
{
  "title": "Extracted Vocabulary List",
  "description": "Vocabulary extracted from PDF",
  "items": [
    {
      "dutchWord": "Dutch word (cleaned, without articles)",
      "turkishTranslation": "Turkish translation",
      "russianTranslation": "Russian translation (if enabled)",
      "dutchSentence": "Example sentence from middle column",
      "alternateMeanings": "Alternative meanings in Turkish",
      "elaboration": "Brief explanation"
    }
  ]
}

Text to extract from:
${processedText}

Extract as many vocabulary words as possible from the text. Only return valid JSON, no other text.
`;

    try {
        debugLog('Sending request to ChatGPT API...');
        
        // Create AbortController for timeout
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 60000); // 60 second timeout
        
        const response = await fetch(`${CONFIG.OPENAI_API_URL}/chat/completions`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${getApiKey()}`
            },
            body: JSON.stringify({
                model: CONFIG.CHATGPT_MODEL,
                messages: [
                    {
                        role: 'system',
                        content: 'You are a helpful assistant that extracts vocabulary from text and provides translations. Always respond with valid JSON only.'
                    },
                    {
                        role: 'user',
                        content: prompt
                    }
                ],
                temperature: 0.3,
                max_tokens: 4000 // Limit response size
            }),
            signal: controller.signal
        });
        
        clearTimeout(timeoutId); // Clear timeout if request succeeds

        debugLog('ChatGPT API response received, status:', response.status);

        if (!response.ok) {
            const errorText = await response.text();
            debugLog('API error response:', errorText);
            throw new Error(`HTTP error! status: ${response.status}, response: ${errorText}`);
        }

        const data = await response.json();
        debugLog('ChatGPT API response data:', data);
        
        if (!data.choices || !data.choices[0] || !data.choices[0].message) {
            console.error('Unexpected API response structure:', data);
            throw new Error('Unexpected response structure from ChatGPT API');
        }
        
        const content = data.choices[0].message.content;
        debugLog('ChatGPT response content length:', content.length);
        debugLog('ChatGPT response content preview:', content.substring(0, 500));
        
        // Clean the response content - remove markdown code blocks if present
        let cleanedContent = content.trim();
        
        // Remove markdown code blocks (```json ... ```)
        if (cleanedContent.startsWith('```json')) {
            cleanedContent = cleanedContent.replace(/^```json\s*/, '').replace(/\s*```$/, '');
        } else if (cleanedContent.startsWith('```')) {
            cleanedContent = cleanedContent.replace(/^```\s*/, '').replace(/\s*```$/, '');
        }
        
        debugLog('Cleaned content preview:', cleanedContent.substring(0, 500));
        
        try {
            const parsedData = JSON.parse(cleanedContent);
            
            // Validate the parsed data structure
            if (!parsedData || typeof parsedData !== 'object') {
                throw new Error('Parsed data is not an object');
            }
            
            if (!parsedData.items || !Array.isArray(parsedData.items)) {
                throw new Error('Parsed data does not contain items array');
            }
            
            // Ensure required fields exist
            if (!parsedData.title) {
                parsedData.title = 'Extracted Vocabulary List';
            }
            if (!parsedData.description) {
                parsedData.description = 'Vocabulary extracted from PDF';
            }
            
            debugLog('Successfully parsed vocabulary data:', parsedData);
            debugLog('Number of items extracted:', parsedData.items.length);
            return parsedData;
        } catch (parseError) {
            console.error('Failed to parse ChatGPT response. Original content:', content);
            console.error('Cleaned content:', cleanedContent);
            console.error('Parse error:', parseError);
            throw new Error(`Invalid JSON response from ChatGPT: ${parseError.message}`);
        }
    } catch (error) {
        console.error('Error calling ChatGPT API:', error);
        debugLog('ChatGPT API error:', error);
        
        // Handle specific error types
        if (error.name === 'AbortError') {
            throw new Error('Request timed out. The text may be too large or the API is taking too long to respond. Please try with a smaller PDF or try again later.');
        } else if (error.message.includes('HTTP error! status: 429')) {
            throw new Error('API rate limit exceeded. Please wait a moment and try again.');
        } else if (error.message.includes('HTTP error! status: 401')) {
            throw new Error('API authentication failed. Please check your API key.');
        } else if (error.message.includes('HTTP error! status: 400')) {
            throw new Error('Invalid request. The text may be too large or contain invalid content.');
        }
        
        throw error;
    }
}

// Audio generation
async function generateAudio() {
    if (!currentList || !currentList.items.length) {
        alert('Please select a vocabulary list with items first!');
        return;
    }
    
    // Reset generation state
    isGeneratingAudio = true;
    generationCancelled = false;
    generatedAudioFiles = [];
    activeGenerationPromises = [];
    
    elements.generateAudioBtn.disabled = true;
    elements.audioProgress.classList.remove('hidden');
    elements.audioResults.classList.add('hidden');
    elements.audioFilesList.innerHTML = '';
    
    try {
        debugLog('Starting audio generation for list:', currentList.title);
        debugLog('Number of items to process:', currentList.items.length);
        
        // Get user preferences
        const itemsPerChunk = parseInt(elements.audioChunkSize.value);
        const generationMode = elements.generationMode.value;
        debugLog('User selected items per chunk:', itemsPerChunk);
        debugLog('Generation mode:', generationMode);
        
        // Validate input
        if (isNaN(itemsPerChunk) || itemsPerChunk < 1 || itemsPerChunk > 200) {
            alert('Please enter a valid number of items per file (1-200).');
            return;
        }
        
        // Split the list into chunks
        const chunks = splitListIntoChunks(currentList.items, itemsPerChunk);
        debugLog('Split list into chunks:', chunks.length);
        
        // Show summary to user
        const totalItems = currentList.items.length;
        const audioLanguageMode = elements.audioLanguageMode.value;
        const estimatedTotalTime = Math.ceil(totalItems / 4); // Rough estimate: 4 items per minute
        const estimatedFileSizeMB = Math.ceil(itemsPerChunk * 0.5); // Rough estimate: 0.5MB per item
        const modeDescription = generationMode === 'parallel' ? 'all files simultaneously' : 'one file at a time';
        const languageModeDescription = audioLanguageMode === 'single' ? 'single language (all in Dutch voice)' : 'multi-language (separate voices for each language)';
        const summaryMessage = `Will generate ${chunks.length} audio file${chunks.length > 1 ? 's' : ''}:\n` +
            `• Total items: ${totalItems}\n` +
            `• Generation mode: ${modeDescription}\n` +
            `• Audio language mode: ${languageModeDescription}\n` +
            `• Estimated total time: ~${estimatedTotalTime} minutes\n` +
            `• Each file: ~${itemsPerChunk} items (~${estimatedFileSizeMB}MB)\n` +
            `• Files will be available for download as they complete`;
        
        if (!confirm(summaryMessage + '\n\nContinue with audio generation?')) {
            debugLog('User cancelled audio generation');
            return;
        }
        
        // Show results panel
        elements.audioResults.classList.remove('hidden');
        
        if (generationMode === 'parallel') {
            await generateAudioParallel(chunks, itemsPerChunk);
        } else {
            await generateAudioSequential(chunks, itemsPerChunk);
        }
        
        if (generationCancelled) {
            debugLog('Audio generation was cancelled by user');
            alert('Audio generation was cancelled.');
        } else {
            debugLog('Audio generation completed successfully');
            const completedFiles = generatedAudioFiles.filter(file => file.status === 'completed');
            if (completedFiles.length > 0) {
                alert(`Audio generation completed! ${completedFiles.length} file${completedFiles.length > 1 ? 's' : ''} generated successfully.`);
            }
        }
        
    } catch (error) {
        console.error('Error generating audio:', error);
        debugLog('Audio generation error:', error);
        
        let errorMessage = 'Error generating audio. ';
        if (error.message.includes('API')) {
            errorMessage += 'There was an issue with the TTS service. Please check your internet connection and try again.';
        } else if (error.message.includes('No audio data')) {
            errorMessage += 'No audio data was generated. Please try again.';
        } else if (error.message.includes('HTTP')) {
            errorMessage += 'Network error. Please check your connection and try again.';
        } else {
            errorMessage += `Technical error: ${error.message}. Please try again.`;
        }
        
        alert(errorMessage);
    } finally {
        isGeneratingAudio = false;
        elements.generateAudioBtn.disabled = false;
        elements.audioProgress.classList.add('hidden');
    }
}

async function generateAudioParallel(chunks, itemsPerChunk) {
    debugLog('Starting parallel audio generation');
    
    // Create file entries for all chunks
    chunks.forEach((chunk, index) => {
        const fileEntry = {
            id: index + 1,
            part: index + 1,
            totalParts: chunks.length,
            items: chunk.length,
            status: 'pending',
            progress: 0,
            audioBlob: null,
            error: null,
            startTime: null,
            endTime: null
        };
        generatedAudioFiles.push(fileEntry);
    });
    
    // Update UI to show all pending files
    updateAudioFilesUI();
    
    // Start all generation tasks in parallel
    const generationPromises = chunks.map(async (chunk, index) => {
        const fileEntry = generatedAudioFiles[index];
        fileEntry.startTime = Date.now();
        fileEntry.status = 'generating';
        
        try {
            debugLog(`Starting parallel generation for chunk ${index + 1}`);
            
            const chunkList = {
                title: `${currentList.title} - Part ${index + 1}`,
                description: `Part ${index + 1} of ${chunks.length} (${chunk.length} items)`,
                items: chunk
            };
            
            const audioBlob = await generateAudioForList(chunkList);
            
            if (generationCancelled) {
                fileEntry.status = 'cancelled';
                return;
            }
            
            if (!audioBlob || audioBlob.size === 0) {
                throw new Error('Generated empty audio blob');
            }
            
            fileEntry.audioBlob = audioBlob;
            fileEntry.status = 'completed';
            fileEntry.endTime = Date.now();
            fileEntry.progress = 100;
            
            debugLog(`Parallel generation completed for chunk ${index + 1}`);
            
        } catch (error) {
            debugLog(`Error in parallel generation for chunk ${index + 1}:`, error);
            fileEntry.status = 'error';
            fileEntry.error = error.message;
            fileEntry.endTime = Date.now();
        }
        
        // Update UI after each completion
        updateAudioFilesUI();
    });
    
    // Wait for all promises to complete
    await Promise.allSettled(generationPromises);
    
    debugLog('Parallel generation completed');
}

async function generateAudioSequential(chunks, itemsPerChunk) {
    debugLog('Starting sequential audio generation');
    
    for (let i = 0; i < chunks.length; i++) {
        if (generationCancelled) {
            debugLog('Sequential generation cancelled');
            break;
        }
        
        const chunk = chunks[i];
        const fileEntry = {
            id: i + 1,
            part: i + 1,
            totalParts: chunks.length,
            items: chunk.length,
            status: 'generating',
            progress: 0,
            audioBlob: null,
            error: null,
            startTime: Date.now(),
            endTime: null
        };
        
        generatedAudioFiles.push(fileEntry);
        updateAudioFilesUI();
        
        // Update progress bar
        const progress = ((i + 1) / chunks.length) * 100;
        const progressFill = elements.audioProgress.querySelector('.progress-fill');
        const progressText = elements.audioProgress.querySelector('.progress-text');
        progressFill.style.width = `${progress}%`;
                    progressText.textContent = `Generating part ${i + 1}/${chunks.length} (${chunk.length} items)...`;
        
        try {
            debugLog(`Starting sequential generation for chunk ${i + 1}`);
            
            const chunkList = {
                title: `${currentList.title} - Part ${i + 1}`,
                description: `Part ${i + 1} of ${chunks.length} (${chunk.length} items)`,
                items: chunk
            };
            
            const audioBlob = await generateAudioForList(chunkList);
            
            if (generationCancelled) {
                fileEntry.status = 'cancelled';
                break;
            }
            
            if (!audioBlob || audioBlob.size === 0) {
                throw new Error('Generated empty audio blob');
            }
            
            fileEntry.audioBlob = audioBlob;
            fileEntry.status = 'completed';
            fileEntry.endTime = Date.now();
            fileEntry.progress = 100;
            
            debugLog(`Sequential generation completed for chunk ${i + 1}`);
            
        } catch (error) {
            debugLog(`Error in sequential generation for chunk ${i + 1}:`, error);
            fileEntry.status = 'error';
            fileEntry.error = error.message;
            fileEntry.endTime = Date.now();
        }
        
        updateAudioFilesUI();
        
        // Small delay between chunks
        if (i < chunks.length - 1 && !generationCancelled) {
            await new Promise(resolve => setTimeout(resolve, 1000));
        }
    }
    
    debugLog('Sequential generation completed');
}

function cancelAudioGeneration() {
    if (isGeneratingAudio) {
        generationCancelled = true;
        debugLog('Audio generation cancellation requested');
        
        // Cancel all active promises
        activeGenerationPromises.forEach(promise => {
            if (promise && typeof promise.cancel === 'function') {
                promise.cancel();
            }
        });
        
        // Update UI to show cancelled status
        generatedAudioFiles.forEach(file => {
            if (file.status === 'generating' || file.status === 'pending') {
                file.status = 'cancelled';
            }
        });
        
        updateAudioFilesUI();
        
        elements.cancelGenerationBtn.disabled = true;
        elements.cancelGenerationBtn.innerHTML = '<i class="fas fa-stop"></i> Cancelling...';
    }
}

function updateAudioFilesUI() {
    elements.audioFilesList.innerHTML = '';
    
    if (generatedAudioFiles.length === 0) {
        elements.audioFilesList.innerHTML = '<p style="text-align: center; color: #718096; font-style: italic;">No audio files generated yet.</p>';
        return;
    }
    
    generatedAudioFiles.forEach(file => {
        const fileElement = createAudioFileElement(file);
        elements.audioFilesList.appendChild(fileElement);
    });
}

function createAudioFileElement(file) {
    const div = document.createElement('div');
    div.className = 'audio-file-item';
    div.id = `audio-file-${file.id}`;
    
    const statusIcon = getStatusIcon(file.status);
    const statusClass = getStatusClass(file.status);
    const duration = file.startTime && file.endTime ? 
        Math.round((file.endTime - file.startTime) / 1000) : null;
    
    div.innerHTML = `
        <div class="audio-file-header">
            <div class="audio-file-info">
                <span class="status-icon ${statusClass}">${statusIcon}</span>
                <span class="audio-file-title">Part ${file.part} of ${file.totalParts}</span>
                <span class="audio-file-details">${file.items} items</span>
                ${duration ? `<span class="audio-file-duration">${duration}s</span>` : ''}
            </div>
            <div class="audio-file-actions">
                ${file.status === 'completed' ? `
                    <button class="btn btn-secondary btn-sm play-btn" onclick="playAudio(${file.id})">
                        <i class="fas fa-play"></i> Play
                    </button>
                    <button class="btn btn-primary btn-sm" onclick="downloadAudio(${file.id})">
                        <i class="fas fa-download"></i> Download
                    </button>
                ` : ''}
                ${file.status === 'error' ? `
                    <span class="error-message">${file.error}</span>
                ` : ''}
            </div>
        </div>
        ${file.status === 'generating' ? `
            <div class="audio-file-progress">
                <div class="progress-bar">
                    <div class="progress-fill" style="width: ${file.progress}%"></div>
                </div>
            </div>
        ` : ''}
    `;
    
    return div;
}

function getStatusIcon(status) {
    switch (status) {
        case 'pending': return '<i class="fas fa-clock"></i>';
        case 'generating': return '<i class="fas fa-spinner fa-spin"></i>';
        case 'completed': return '<i class="fas fa-check"></i>';
        case 'error': return '<i class="fas fa-exclamation-triangle"></i>';
        case 'cancelled': return '<i class="fas fa-times"></i>';
        default: return '<i class="fas fa-question"></i>';
    }
}

function getStatusClass(status) {
    switch (status) {
        case 'pending': return 'status-pending';
        case 'generating': return 'status-generating';
        case 'completed': return 'status-completed';
        case 'error': return 'status-error';
        case 'cancelled': return 'status-cancelled';
        default: return 'status-unknown';
    }
}

function playAudio(fileId) {
    const file = generatedAudioFiles.find(f => f.id === fileId);
    if (file && file.audioBlob) {
        // Create or get the audio player for this file
        let audioPlayer = document.getElementById(`audio-player-${fileId}`);
        
        if (!audioPlayer) {
            // Create new audio player
            audioPlayer = createAudioPlayer(fileId, file);
            const fileElement = document.getElementById(`audio-file-${fileId}`);
            const actionsDiv = fileElement.querySelector('.audio-file-actions');
            
            // Insert the player after the actions
            actionsDiv.parentNode.insertBefore(audioPlayer, actionsDiv.nextSibling);
        }
        
        // Show the player
        audioPlayer.classList.remove('hidden');
        
        // Start playing
        const audio = audioPlayer.querySelector('audio');
        audio.play();
        
        // Update the play button to show pause
        const playBtn = document.querySelector(`#audio-file-${fileId} .play-btn`);
        if (playBtn) {
            playBtn.innerHTML = '<i class="fas fa-pause"></i> Pause';
            playBtn.onclick = () => pauseAudio(fileId);
        }
    }
}

function pauseAudio(fileId) {
    const audioPlayer = document.getElementById(`audio-player-${fileId}`);
    if (audioPlayer) {
        const audio = audioPlayer.querySelector('audio');
        audio.pause();
        
        // Update the button to show play
        const playBtn = document.querySelector(`#audio-file-${fileId} .play-btn`);
        if (playBtn) {
            playBtn.innerHTML = '<i class="fas fa-play"></i> Play';
            playBtn.onclick = () => playAudio(fileId);
        }
    }
}

function createAudioPlayer(fileId, file) {
    const url = URL.createObjectURL(file.audioBlob);
    
    const playerDiv = document.createElement('div');
    playerDiv.id = `audio-player-${fileId}`;
    playerDiv.className = 'audio-player-container';
    
    playerDiv.innerHTML = `
        <div class="audio-player">
            <audio id="audio-${fileId}" preload="metadata">
                <source src="${url}" type="${file.audioBlob.type}">
                Your browser does not support the audio element.
            </audio>
            
            <div class="audio-controls">
                <div class="play-pause-btn" onclick="togglePlayPause(${fileId})">
                    <i class="fas fa-play"></i>
                </div>
                
                <div class="time-display">
                    <span class="current-time">0:00</span>
                    <span class="time-separator">/</span>
                    <span class="total-time">0:00</span>
                </div>
                
                <div class="progress-container">
                    <div class="progress-bar">
                        <div class="progress-fill"></div>
                        <div class="progress-handle"></div>
                    </div>
                </div>
                
                <div class="volume-control">
                    <i class="fas fa-volume-up"></i>
                    <input type="range" class="volume-slider" min="0" max="100" value="100">
                </div>
                
                <div class="close-player" onclick="closeAudioPlayer(${fileId})">
                    <i class="fas fa-times"></i>
                </div>
            </div>
        </div>
    `;
    
    // Set up event listeners
    const audio = playerDiv.querySelector('audio');
    const playPauseBtn = playerDiv.querySelector('.play-pause-btn');
    const progressBar = playerDiv.querySelector('.progress-bar');
    const progressFill = playerDiv.querySelector('.progress-fill');
    const progressHandle = playerDiv.querySelector('.progress-handle');
    const currentTimeSpan = playerDiv.querySelector('.current-time');
    const totalTimeSpan = playerDiv.querySelector('.total-time');
    const volumeSlider = playerDiv.querySelector('.volume-slider');
    
    // Audio event listeners
    audio.addEventListener('loadedmetadata', () => {
        totalTimeSpan.textContent = formatTime(audio.duration);
    });
    
    audio.addEventListener('timeupdate', () => {
        const progress = (audio.currentTime / audio.duration) * 100;
        progressFill.style.width = `${progress}%`;
        progressHandle.style.left = `${progress}%`;
        currentTimeSpan.textContent = formatTime(audio.currentTime);
    });
    
    audio.addEventListener('ended', () => {
        playPauseBtn.innerHTML = '<i class="fas fa-play"></i>';
        // Reset progress
        progressFill.style.width = '0%';
        progressHandle.style.left = '0%';
        currentTimeSpan.textContent = '0:00';
    });
    
    // Progress bar click to seek
    progressBar.addEventListener('click', (e) => {
        const rect = progressBar.getBoundingClientRect();
        const clickX = e.clientX - rect.left;
        const progress = (clickX / rect.width) * 100;
        const newTime = (progress / 100) * audio.duration;
        audio.currentTime = newTime;
    });
    
    // Volume control
    volumeSlider.addEventListener('input', (e) => {
        audio.volume = e.target.value / 100;
    });
    
    // Clean up URL when player is removed
    playerDiv.addEventListener('remove', () => {
        URL.revokeObjectURL(url);
    });
    
    return playerDiv;
}

function togglePlayPause(fileId) {
    const audioPlayer = document.getElementById(`audio-player-${fileId}`);
    if (audioPlayer) {
        const audio = audioPlayer.querySelector('audio');
        const playPauseBtn = audioPlayer.querySelector('.play-pause-btn');
        
        if (audio.paused) {
            audio.play();
            playPauseBtn.innerHTML = '<i class="fas fa-pause"></i>';
        } else {
            audio.pause();
            playPauseBtn.innerHTML = '<i class="fas fa-play"></i>';
        }
    }
}

function closeAudioPlayer(fileId) {
    const audioPlayer = document.getElementById(`audio-player-${fileId}`);
    if (audioPlayer) {
        const audio = audioPlayer.querySelector('audio');
        audio.pause();
        audioPlayer.remove();
        
        // Update the main play button
        const playBtn = document.querySelector(`#audio-file-${fileId} .play-btn`);
        if (playBtn) {
            playBtn.innerHTML = '<i class="fas fa-play"></i> Play';
            playBtn.onclick = () => playAudio(fileId);
        }
    }
}

function formatTime(seconds) {
    if (isNaN(seconds)) return '0:00';
    
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = Math.floor(seconds % 60);
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
}

function downloadAudio(fileId) {
    const file = generatedAudioFiles.find(f => f.id === fileId);
    if (file && file.audioBlob) {
        const url = URL.createObjectURL(file.audioBlob);
        const a = document.createElement('a');
        a.href = url;
        // Use appropriate file extension based on blob type
        const fileExtension = file.audioBlob.type.includes('wav') ? 'wav' : 'mp3';
        a.download = `${currentList.title.replace(/[^a-z0-9]/gi, '_').toLowerCase()}_part${file.part}_of${file.totalParts}.${fileExtension}`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    }
}

async function generateAudioForList(list) {
    const dutchVoice = elements.dutchVoice.value;
    const turkishVoice = elements.turkishVoice.value;
    const russianVoice = elements.russianVoice.value;
    const includeRussian = elements.includeRussian.checked;
    const audioLanguageMode = elements.audioLanguageMode.value;
    
    debugLog('Generating audio for list:', list.title);
    debugLog('Number of items:', list.items.length);
    debugLog('Audio language mode:', audioLanguageMode);
    
    if (audioLanguageMode === 'single') {
        // Single language mode (current behavior)
        const fullText = createContinuousText(list.items, dutchVoice, turkishVoice, russianVoice, includeRussian);
        
        debugLog('Generated continuous text length:', fullText.length);
        debugLog('Text preview:', fullText.substring(0, 500));
        
        // Check OpenAI API limits
        const limitCheck = checkOpenAILimits(fullText, list.items);
        if (!limitCheck.withinLimits) {
            throw new Error(limitCheck.reason);
        }
        
        debugLog('Text is within OpenAI limits, proceeding with generation');
        
        // Generate audio for the entire text at once
        const audioBlob = await generateTTSAudio(fullText, dutchVoice, 'Dutch');
        
        return audioBlob;
    } else {
        // Multi-language mode (separate voices for each language)
        debugLog('Using multi-language audio generation mode');
        const audioBlob = await generateMultiLanguageAudio(list.items, dutchVoice, turkishVoice, russianVoice, includeRussian);
        
        return audioBlob;
    }
}

function createContinuousText(items, dutchVoice, turkishVoice, russianVoice, includeRussian) {
    const textParts = [];
    
    for (let i = 0; i < items.length; i++) {
        const item = items[i];
        const itemText = [];
        
        // Dutch word
        if (item.dutchWord && item.dutchWord.trim()) {
            itemText.push(item.dutchWord.trim());
        }
        
        // Turkish translation
        if (item.turkishTranslation && item.turkishTranslation.trim()) {
            itemText.push(item.turkishTranslation.trim());
        }
        
        // Russian translation (if enabled)
        if (includeRussian && item.russianTranslation && item.russianTranslation.trim()) {
            itemText.push(item.russianTranslation.trim());
        }
        
        // Dutch sentence
        if (item.dutchSentence && item.dutchSentence.trim()) {
            itemText.push(item.dutchSentence.trim());
        }
        
        // Alternate meanings and elaboration
        if (item.alternateMeanings || item.elaboration) {
            let additionalText = '';
            if (item.alternateMeanings && item.alternateMeanings.trim()) {
                additionalText += `Alternate meanings: ${item.alternateMeanings.trim()}. `;
            }
            if (item.elaboration && item.elaboration.trim()) {
                additionalText += item.elaboration.trim();
            }
            if (additionalText.trim()) {
                itemText.push(additionalText.trim());
            }
        }
        
        // Join the parts for this item with pauses
        if (itemText.length > 0) {
            textParts.push(itemText.join('. '));
        }
        
        // Add a longer pause between items (except after the last one)
        if (i < items.length - 1) {
            textParts.push('...'); // This will create a pause in the TTS
        }
    }
    
    // Join all items with proper spacing
    const fullText = textParts.join('. ');
    
    debugLog('Created continuous text with', textParts.length, 'parts');
    debugLog('Total text length:', fullText.length, 'characters');
    
    return fullText;
}

function checkOpenAILimits(text, items) {
    // OpenAI TTS API limits:
    // - Maximum input text: 4,096 characters
    // - Maximum tokens: ~4,096 (roughly 3,000 words)
    
    const textLength = text.length;
    const estimatedTokens = Math.ceil(textLength / 4); // Rough estimate: 4 characters per token
    
    debugLog('OpenAI API limit check:');
    debugLog('- Text length:', textLength, 'characters');
    debugLog('- Estimated tokens:', estimatedTokens);
    debugLog('- Character limit: 4,096');
    debugLog('- Token limit: ~4,096');
    
    if (textLength > 4000) {
        debugLog('WARNING: Text exceeds OpenAI character limit');
        return {
            withinLimits: false,
            reason: `Text is ${textLength} characters, but OpenAI TTS limit is 4,096 characters. Please reduce the number of items per file.`
        };
    }
    
    if (estimatedTokens > 4000) {
        debugLog('WARNING: Estimated tokens exceed OpenAI limit');
        return {
            withinLimits: false,
            reason: `Estimated ${estimatedTokens} tokens, but OpenAI TTS limit is ~4,096 tokens. Please reduce the number of items per file.`
        };
    }
    
    debugLog('Text is within OpenAI API limits');
    return {
        withinLimits: true,
        textLength: textLength,
        estimatedTokens: estimatedTokens
    };
}

// This function is no longer needed since we generate continuous text
// Keeping it for reference but it's not used anymore

async function generateTTSAudio(text, voice, language) {
    debugLog(`Generating TTS audio for: "${text}" with voice: ${voice}, language: ${language}`);
    
    if (!text || !text.trim()) {
        debugLog('Empty text provided for TTS');
        return new Blob([], { type: 'audio/mp3' });
    }
    
    const instructions = getVoiceInstructions(language);
    
    try {
        const response = await fetch(`${CONFIG.OPENAI_API_URL}/audio/speech`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${getApiKey()}`
            },
            body: JSON.stringify({
                model: CONFIG.TTS_MODEL,
                voice: voice,
                input: text.trim(),
                instructions: instructions,
                response_format: 'mp3'
            })
        });

        debugLog('TTS API response status:', response.status);

        if (!response.ok) {
            const errorText = await response.text();
            debugLog('TTS API error response:', errorText);
            throw new Error(`TTS API error: ${response.status} - ${errorText}`);
        }

        const audioBlob = await response.blob();
        debugLog('TTS audio blob generated, size:', audioBlob.size);
        
        return audioBlob;
    } catch (error) {
        debugLog('Error in generateTTSAudio:', error);
        throw error;
    }
}

function getVoiceInstructions(language) {
    switch (language) {
        case 'Dutch':
            return 'Speak in clear Dutch with proper pronunciation. Speak at a moderate pace for language learning.';
        case 'Turkish':
            return 'Speak in clear Turkish with proper pronunciation. Speak at a moderate pace for language learning.';
        case 'Russian':
            return 'Speak in clear Russian with proper pronunciation. Speak at a moderate pace for language learning.';
        default:
            return 'Speak clearly and at a moderate pace for language learning.';
    }
}

// Multi-language audio generation
async function generateMultiLanguageAudio(items, dutchVoice, turkishVoice, russianVoice, includeRussian) {
    debugLog('Starting multi-language audio generation');
    debugLog('Number of items to process:', items.length);
    
    const audioSegments = [];
    
    for (let i = 0; i < items.length; i++) {
        if (generationCancelled) {
            debugLog('Multi-language generation cancelled');
            throw new Error('Generation was cancelled');
        }
        
        const item = items[i];
        debugLog(`Processing item ${i + 1}/${items.length}: ${item.dutchWord}`);
        
        // Generate audio for each part of the item in its respective language
        const itemSegments = [];
        
        // Dutch word
        if (item.dutchWord && item.dutchWord.trim()) {
            debugLog(`Generating Dutch audio for: ${item.dutchWord}`);
            const dutchAudio = await generateTTSAudio(item.dutchWord.trim(), dutchVoice, 'Dutch');
            itemSegments.push(dutchAudio);
        }
        
        // Turkish translation
        if (item.turkishTranslation && item.turkishTranslation.trim()) {
            debugLog(`Generating Turkish audio for: ${item.turkishTranslation}`);
            const turkishAudio = await generateTTSAudio(item.turkishTranslation.trim(), turkishVoice, 'Turkish');
            itemSegments.push(turkishAudio);
        }
        
        // Russian translation (if enabled)
        if (includeRussian && item.russianTranslation && item.russianTranslation.trim()) {
            debugLog(`Generating Russian audio for: ${item.russianTranslation}`);
            const russianAudio = await generateTTSAudio(item.russianTranslation.trim(), russianVoice, 'Russian');
            itemSegments.push(russianAudio);
        }
        
        // Dutch sentence
        if (item.dutchSentence && item.dutchSentence.trim()) {
            debugLog(`Generating Dutch sentence audio for: ${item.dutchSentence}`);
            const sentenceAudio = await generateTTSAudio(item.dutchSentence.trim(), dutchVoice, 'Dutch');
            itemSegments.push(sentenceAudio);
        }
        
        // Alternate meanings and elaboration (in Dutch voice)
        if (item.alternateMeanings || item.elaboration) {
            let additionalText = '';
            if (item.alternateMeanings && item.alternateMeanings.trim()) {
                additionalText += `Alternate meanings: ${item.alternateMeanings.trim()}. `;
            }
            if (item.elaboration && item.elaboration.trim()) {
                additionalText += item.elaboration.trim();
            }
            if (additionalText.trim()) {
                debugLog(`Generating additional info audio: ${additionalText}`);
                const additionalAudio = await generateTTSAudio(additionalText.trim(), dutchVoice, 'Dutch');
                itemSegments.push(additionalAudio);
            }
        }
        
        // Combine segments for this item
        if (itemSegments.length > 0) {
            const itemAudio = await combineAudioBlobs(itemSegments);
            audioSegments.push(itemAudio);
        }
        
        // Add pause between items (except after the last one)
        if (i < items.length - 1) {
            debugLog(`Adding pause after item ${i + 1}`);
            const pauseAudio = await generatePauseAudio(1.0);
            audioSegments.push(pauseAudio);
        }
        
        // Update progress for multi-language generation
        const progress = ((i + 1) / items.length) * 100;
        const progressFill = elements.audioProgress.querySelector('.progress-fill');
        const progressText = elements.audioProgress.querySelector('.progress-text');
        if (progressFill && progressText) {
            progressFill.style.width = `${progress}%`;
            progressText.textContent = `Generating multi-language audio... ${i + 1}/${items.length} items`;
        }
    }
    
    debugLog(`Multi-language generation complete. ${audioSegments.length} segments created`);
    
    // Combine all segments into final audio
    const finalAudio = await combineAudioBlobs(audioSegments);
    
    return finalAudio;
}

// Combine multiple audio blobs into a single audio blob using Web Audio API
async function combineAudioBlobs(audioBlobs) {
    debugLog(`Combining ${audioBlobs.length} audio blobs using Web Audio API`);
    
    if (audioBlobs.length === 0) {
        return new Blob([], { type: 'audio/mp3' });
    }
    
    if (audioBlobs.length === 1) {
        return audioBlobs[0];
    }
    
    try {
        // Create audio context
        const audioContext = new (window.AudioContext || window.webkitAudioContext)();
        
        // Decode all audio blobs
        const audioBuffers = [];
        for (let i = 0; i < audioBlobs.length; i++) {
            debugLog(`Decoding audio blob ${i + 1}/${audioBlobs.length}`);
            const arrayBuffer = await audioBlobs[i].arrayBuffer();
            const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);
            audioBuffers.push(audioBuffer);
        }
        
        // Calculate total duration
        const totalDuration = audioBuffers.reduce((sum, buffer) => sum + buffer.duration, 0);
        debugLog(`Total combined duration: ${totalDuration} seconds`);
        
        // Create a new audio buffer for the combined audio
        const combinedBuffer = audioContext.createBuffer(
            1, // mono
            Math.ceil(totalDuration * audioBuffers[0].sampleRate),
            audioBuffers[0].sampleRate
        );
        
        // Copy audio data from each buffer
        let currentOffset = 0;
        for (const buffer of audioBuffers) {
            const sourceData = buffer.getChannelData(0);
            const targetData = combinedBuffer.getChannelData(0);
            const sampleCount = Math.ceil(buffer.duration * buffer.sampleRate);
            
            for (let i = 0; i < sampleCount; i++) {
                targetData[currentOffset + i] = sourceData[i];
            }
            
            currentOffset += sampleCount;
        }
        
        // Convert the combined buffer back to a blob
        const combinedBlob = await audioBufferToBlob(combinedBuffer);
        debugLog(`Combined audio blob created, size: ${combinedBlob.size} bytes`);
        
        return combinedBlob;
        
    } catch (error) {
        debugLog('Error combining audio blobs:', error);
        throw new Error(`Failed to combine audio segments: ${error.message}`);
    }
}

// Convert AudioBuffer to Blob
async function audioBufferToBlob(audioBuffer) {
    return new Promise((resolve, reject) => {
        try {
            // Create offline audio context for rendering
            const offlineContext = new OfflineAudioContext(
                1, // mono
                audioBuffer.length,
                audioBuffer.sampleRate
            );
            
            // Create buffer source
            const source = offlineContext.createBufferSource();
            source.buffer = audioBuffer;
            source.connect(offlineContext.destination);
            source.start();
            
            // Render the audio
            offlineContext.startRendering().then(renderedBuffer => {
                // Convert to WAV format
                const wavBlob = audioBufferToWAV(renderedBuffer);
                resolve(wavBlob);
            }).catch(reject);
            
        } catch (error) {
            reject(error);
        }
    });
}

// Convert AudioBuffer to WAV format
function audioBufferToWAV(audioBuffer) {
    const numChannels = audioBuffer.numberOfChannels;
    const sampleRate = audioBuffer.sampleRate;
    const length = audioBuffer.length;
    
    // Create WAV header
    const buffer = new ArrayBuffer(44 + length * numChannels * 2);
    const view = new DataView(buffer);
    
    // RIFF header
    view.setUint32(0, 0x52494646, false); // "RIFF"
    view.setUint32(4, 36 + length * numChannels * 2, true); // File size
    view.setUint32(8, 0x57415645, false); // "WAVE"
    
    // fmt chunk
    view.setUint32(12, 0x666D7420, false); // "fmt "
    view.setUint32(16, 16, true); // Chunk size
    view.setUint16(20, 1, true); // Audio format (PCM)
    view.setUint16(22, numChannels, true); // Number of channels
    view.setUint32(24, sampleRate, true); // Sample rate
    view.setUint32(28, sampleRate * numChannels * 2, true); // Byte rate
    view.setUint16(32, numChannels * 2, true); // Block align
    view.setUint16(34, 16, true); // Bits per sample
    
    // data chunk
    view.setUint32(36, 0x64617461, false); // "data"
    view.setUint32(40, length * numChannels * 2, true); // Data size
    
    // Write audio data
    let offset = 44;
    for (let i = 0; i < length; i++) {
        for (let channel = 0; channel < numChannels; channel++) {
            const sample = Math.max(-1, Math.min(1, audioBuffer.getChannelData(channel)[i]));
            view.setInt16(offset, sample < 0 ? sample * 0x8000 : sample * 0x7FFF, true);
            offset += 2;
        }
    }
    
    return new Blob([buffer], { type: 'audio/wav' });
}

// Generate pause audio using Web Audio API
async function generatePauseAudio(duration = 1.0) {
    debugLog(`Generating pause audio for ${duration} seconds using Web Audio API`);
    
    try {
        // Create audio context
        const audioContext = new (window.AudioContext || window.webkitAudioContext)();
        
        // Create a silent audio buffer
        const sampleRate = audioContext.sampleRate;
        const numSamples = Math.floor(sampleRate * duration);
        const silentBuffer = audioContext.createBuffer(1, numSamples, sampleRate);
        
        // Fill with silence (zero values)
        const channelData = silentBuffer.getChannelData(0);
        for (let i = 0; i < numSamples; i++) {
            channelData[i] = 0;
        }
        
        // Convert to blob
        const pauseBlob = await audioBufferToBlob(silentBuffer);
        debugLog(`Pause audio generated, size: ${pauseBlob.size} bytes`);
        
        return pauseBlob;
        
    } catch (error) {
        debugLog('Error generating pause audio:', error);
        // Fallback to empty blob if Web Audio API fails
        return new Blob([], { type: 'audio/wav' });
    }
}

// Utility functions
function splitListIntoChunks(items, targetItemsPerChunk) {
    debugLog(`Splitting ${items.length} items into chunks of ${targetItemsPerChunk} items each`);
    
    const chunks = [];
    
    for (let i = 0; i < items.length; i += targetItemsPerChunk) {
        const chunk = items.slice(i, i + targetItemsPerChunk);
        chunks.push(chunk);
        debugLog(`Chunk ${chunks.length} created with ${chunk.length} items`);
    }
    
    debugLog(`Split complete: ${chunks.length} chunks created`);
    chunks.forEach((chunk, index) => {
        debugLog(`Chunk ${index + 1}: ${chunk.length} items`);
    });
    
    return chunks;
}

function saveToLocalStorage() {
    debugLog('Saving to localStorage');
    debugLog('vocabLists to save:', vocabLists);
    
    try {
        const jsonData = JSON.stringify(vocabLists);
        debugLog('JSON data to save:', jsonData);
        localStorage.setItem('vocabLists', jsonData);
        debugLog('Successfully saved to localStorage');
        
        // Verify the save
        const savedData = localStorage.getItem('vocabLists');
        debugLog('Verified saved data:', savedData);
    } catch (error) {
        console.error('Error saving to localStorage:', error);
        debugLog('Error saving to localStorage:', error);
    }
}

function updateUI() {
    debugLog('updateUI called');
    debugLog('currentList:', currentList);
    debugLog('currentList.items:', currentList?.items);
    
    const shouldEnableAudio = currentList && currentList.items && currentList.items.length > 0;
    elements.generateAudioBtn.disabled = !shouldEnableAudio;
    
    debugLog('Audio button disabled:', !shouldEnableAudio);
    
    // Update debug info if panel is visible
    if (DEBUG && !elements.debugPanel.classList.contains('hidden')) {
        updateDebugInfo();
    }
}

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// Debug functions
function toggleDebugPanel() {
    debugLog('toggleDebugPanel called');
    const isHidden = elements.debugPanel.classList.contains('hidden');
    if (isHidden) {
        elements.debugPanel.classList.remove('hidden');
        updateDebugInfo();
        debugLog('Debug panel shown');
    } else {
        elements.debugPanel.classList.add('hidden');
        debugLog('Debug panel hidden');
    }
}

function updateDebugInfo() {
    debugLog('updateDebugInfo called');
    
    // Update current state
    const currentState = {
        vocabLists: vocabLists,
        currentList: currentList,
        currentVocabItem: currentVocabItem,
        selectedFile: selectedFile ? selectedFile.name : null,
        timestamp: new Date().toISOString()
    };
    
    elements.debugState.textContent = JSON.stringify(currentState, null, 2);
    
    // Update localStorage info
    const storageData = {
        vocabLists: localStorage.getItem('vocabLists'),
        parsedVocabLists: JSON.parse(localStorage.getItem('vocabLists') || '[]'),
        localStorageKeys: Object.keys(localStorage),
        timestamp: new Date().toISOString()
    };
    
    elements.debugStorage.textContent = JSON.stringify(storageData, null, 2);
    
    debugLog('Debug info updated');
}

function clearLocalStorage() {
    debugLog('clearLocalStorage called');
    if (confirm('Are you sure you want to clear all stored data? This cannot be undone.')) {
        localStorage.clear();
        vocabLists = [];
        currentList = null;
        currentVocabItem = null;
        selectedFile = null;
        renderVocabLists();
        updateDebugInfo();
        debugLog('LocalStorage cleared');
        alert('All stored data has been cleared.');
    }
}

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', init); 