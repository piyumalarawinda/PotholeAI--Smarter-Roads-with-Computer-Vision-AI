document.addEventListener('DOMContentLoaded', () => {
    // API Endpoint Configuration
    const API_URL = 'http://localhost:8008';

    // Session Statistics
    let processedCount = 0;
    let totalPotholesCount = 0;

    // DOM Elements
    const apiStatusDot = document.getElementById('apiStatusDot');
    const apiStatusText = document.getElementById('apiStatusText');
    const tabButtons = document.querySelectorAll('.tab-btn');
    const tabContents = document.querySelectorAll('.tab-content');
    
    // Lab DOM Elements
    const confSlider = document.getElementById('confSlider');
    const confValue = document.getElementById('confValue');
    const sessionProcessed = document.getElementById('sessionProcessed');
    const sessionDetected = document.getElementById('sessionDetected');
    
    // Stages
    const uploadStage = document.getElementById('uploadStage');
    const resultsStage = document.getElementById('resultsStage');
    const btnBackToUpload = document.getElementById('btnBackToUpload');
    
    // File inputs & Dropzone
    const fileInput = document.getElementById('fileInput');
    const dropZone = document.getElementById('dropZone');
    const sampleCards = document.querySelectorAll('.sample-card');
    
    // Image views & Overlay
    const viewAnnotated = document.getElementById('viewAnnotated');
    const viewOriginal = document.getElementById('viewOriginal');
    const annotatedImage = document.getElementById('annotatedImage');
    const originalImage = document.getElementById('originalImage');
    const loaderOverlay = document.getElementById('loaderOverlay');
    const telemetryTime = document.getElementById('telemetryTime');
    
    // Telemetry results
    const valPotholes = document.getElementById('valPotholes');
    const valConfidence = document.getElementById('valConfidence');
    const valRisk = document.getElementById('valRisk');
    const cardRisk = document.getElementById('cardRisk');
    const detectionsList = document.getElementById('detectionsList');

    // Code Snippets Elements
    const codeTabBtns = document.querySelectorAll('.code-tab-btn');
    const codeSnippets = document.querySelectorAll('.code-snippet');

    // --- Tab Switcher Logic ---
    tabButtons.forEach(btn => {
        btn.addEventListener('click', () => {
            const targetTab = btn.dataset.tab;
            
            tabButtons.forEach(b => b.classList.remove('active'));
            tabContents.forEach(c => c.classList.remove('active'));
            
            btn.classList.add('active');
            document.getElementById(targetTab).classList.add('active');
        });
    });

    // --- Home CTA Transition ---
    const btnStartDetecting = document.getElementById('btnStartDetecting');
    if (btnStartDetecting) {
        btnStartDetecting.addEventListener('click', () => {
            const labTabBtn = document.querySelector('[data-tab="lab-tab"]');
            if (labTabBtn) labTabBtn.click();
        });
    }

    // --- Developer API Code Tabs ---
    codeTabBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            const targetLang = btn.dataset.lang;
            
            codeTabBtns.forEach(b => b.classList.remove('active'));
            codeSnippets.forEach(s => s.classList.remove('active'));
            
            btn.classList.add('active');
            document.getElementById(`code-${targetLang}`).classList.add('active');
        });
    });

    // --- Check API Health ---
    async function checkApiHealth() {
        try {
            const res = await fetch(API_URL + '/');
            if (res.ok) {
                apiStatusDot.className = 'status-dot online pulsing';
                apiStatusText.textContent = 'API Connected';
                apiStatusText.style.color = '#10b981';
            } else {
                throw new Error();
            }
        } catch (e) {
            apiStatusDot.className = 'status-dot offline pulsing';
            apiStatusText.textContent = 'API Offline';
            apiStatusText.style.color = '#f43f5e';
        }
    }

    checkApiHealth();
    setInterval(checkApiHealth, 10000); // Check status every 10s

    // --- Confidence Slider Handler ---
    confSlider.addEventListener('input', (e) => {
        confValue.textContent = parseFloat(e.target.value).toFixed(2);
    });

    // --- File Selection & Dropzone Handlers ---
    dropZone.addEventListener('click', () => fileInput.click());

    fileInput.addEventListener('change', (e) => {
        if (e.target.files.length > 0) {
            handleFileUpload(e.target.files[0]);
        }
    });

    // Drag and Drop
    ['dragenter', 'dragover'].forEach(eventName => {
        dropZone.addEventListener(eventName, (e) => {
            e.preventDefault();
            e.stopPropagation();
            dropZone.classList.add('dragover');
        }, false);
    });

    ['dragleave', 'drop'].forEach(eventName => {
        dropZone.addEventListener(eventName, (e) => {
            e.preventDefault();
            e.stopPropagation();
            dropZone.classList.remove('dragover');
        }, false);
    });

    dropZone.addEventListener('drop', (e) => {
        const dt = e.dataTransfer;
        const files = dt.files;
        if (files.length > 0) {
            handleFileUpload(files[0]);
        }
    });

    // --- Quick-Test Sample Click Handler ---
    sampleCards.forEach(card => {
        card.addEventListener('click', async (e) => {
            e.stopPropagation();
            const sampleType = card.dataset.sample;
            const sampleUrl = `samples/${sampleType}.jpg`;
            
            try {
                // Show loading immediately in the UI state
                uploadStage.classList.add('hidden');
                resultsStage.classList.remove('hidden');
                loaderOverlay.classList.remove('hidden');
                
                // Clear old result images
                annotatedImage.src = '';
                originalImage.src = '';
                
                // Fetch the sample image asset and convert to a file blob
                const res = await fetch(sampleUrl);
                if (!res.ok) throw new Error('Sample image not found');
                const blob = await res.blob();
                const file = new File([blob], `${sampleType}.jpg`, { type: 'image/jpeg' });
                
                // Set the original preview
                const reader = new FileReader();
                reader.onload = (event) => {
                    originalImage.src = event.target.result;
                };
                reader.readAsDataURL(file);
                
                // Trigger detection
                await runInference(file);
            } catch (err) {
                alert('Error loading sample image: ' + err.message);
                resetToUpload();
            }
        });
    });

    // Back to Upload Stage
    btnBackToUpload.addEventListener('click', resetToUpload);

    function resetToUpload() {
        resultsStage.classList.add('hidden');
        uploadStage.classList.remove('hidden');
        fileInput.value = '';
        annotatedImage.src = '';
        originalImage.src = '';
    }

    // Toggle view handlers
    viewAnnotated.addEventListener('click', () => {
        viewAnnotated.classList.add('active');
        viewOriginal.classList.remove('active');
        annotatedImage.classList.remove('hidden');
        originalImage.classList.add('hidden');
    });

    viewOriginal.addEventListener('click', () => {
        viewOriginal.classList.add('active');
        viewAnnotated.classList.remove('active');
        originalImage.classList.remove('hidden');
        annotatedImage.classList.add('hidden');
    });

    // --- Handle File Upload Workflow ---
    function handleFileUpload(file) {
        if (!file.type.startsWith('image/')) {
            alert('Please upload an image file (PNG, JPG, JPEG)');
            return;
        }

        // Switch layout to Results Stage
        uploadStage.classList.add('hidden');
        resultsStage.classList.remove('hidden');
        loaderOverlay.classList.remove('hidden');
        
        // Render Original Image Preview
        const reader = new FileReader();
        reader.onload = (e) => {
            originalImage.src = e.target.result;
        };
        reader.readAsDataURL(file);

        // Run Inference
        runInference(file);
    }

    // --- Run YOLO Inference API ---
    async function runInference(file) {
        const threshold = confSlider.value;
        const formData = new FormData();
        formData.append('file', file);

        try {
            const response = await fetch(`${API_URL}/detect?conf=${threshold}`, {
                method: 'POST',
                body: formData
            });

            if (!response.ok) {
                throw new Error('API server returned error status ' + response.status);
            }

            const data = await response.json();
            displayResults(data);
        } catch (error) {
            console.error('Detection error:', error);
            alert('Error running pothole detection. Ensure the FastAPI backend is running on port 8000.');
            resetToUpload();
        } finally {
            loaderOverlay.classList.add('hidden');
        }
    }

    // --- Display Inference Results ---
    function displayResults(data) {
        // Increment session statistics
        processedCount++;
        totalPotholesCount += data.count;
        sessionProcessed.textContent = processedCount;
        sessionDetected.textContent = totalPotholesCount;

        // Set annotated base64 image
        annotatedImage.src = `data:image/jpeg;base64,${data.image}`;
        
        // Show Annotated view by default
        viewAnnotated.click();

        // Update telemetry processing time
        telemetryTime.textContent = data.inference_time_ms;

        // Update KPI metrics
        valPotholes.textContent = data.count;

        // Average confidence
        let avgConf = 0;
        if (data.count > 0) {
            const sum = data.detections.reduce((acc, curr) => acc + curr.confidence, 0);
            avgConf = Math.round((sum / data.count) * 100);
        }
        valConfidence.textContent = `${avgConf}%`;

        // Road Risk Meter
        valRisk.className = 'metric-val';
        if (data.count === 0) {
            valRisk.textContent = 'Clear / Safe';
            valRisk.classList.add('text-green');
        } else if (data.count <= 3) {
            valRisk.textContent = 'Moderate';
            valRisk.classList.add('text-yellow');
        } else {
            valRisk.textContent = 'High / Danger';
            valRisk.classList.add('text-red');
        }

        // Render Detections details list
        detectionsList.innerHTML = '';
        if (data.count === 0) {
            detectionsList.innerHTML = `
                <div style="text-align: center; color: var(--text-muted); font-size: 13px; padding: 20px;">
                    Road looks fully intact. No anomalies detected.
                </div>
            `;
        } else {
            data.detections.forEach((det, index) => {
                const confPercentage = Math.round(det.confidence * 100);
                const coords = det.bbox.map(c => Math.round(c)).join(', ');
                
                const item = document.createElement('div');
                item.className = 'detection-list-item';
                
                // Use severity coloring per detection confidence
                if (det.confidence > 0.7) {
                    item.style.borderLeftColor = 'var(--danger)';
                } else if (det.confidence > 0.4) {
                    item.style.borderLeftColor = 'var(--warning)';
                } else {
                    item.style.borderLeftColor = 'var(--primary)';
                }

                item.innerHTML = `
                    <div>
                        <div class="det-label">🕳️ Pothole #${index + 1}</div>
                        <div class="det-coord">Box coords: [${coords}]</div>
                    </div>
                    <span class="det-conf">${confPercentage}%</span>
                `;
                detectionsList.appendChild(item);
            });
        }
    }
});