document.addEventListener('DOMContentLoaded', () => {
    // UI Elements
    const navButtons = document.querySelectorAll('.nav-btn');
    const tabContents = document.querySelectorAll('.tab-content');
    const pageTitle = document.getElementById('page-title');
    const pageSubtitle = document.getElementById('page-subtitle');
    
    // Status Elements
    const pineconePulse = document.getElementById('pinecone-pulse');
    const statusTitleText = document.getElementById('status-title-text');
    const sidebarIndexName = document.getElementById('sidebar-index-name');
    const sidebarDim = document.getElementById('sidebar-dim');
    const btnRefreshStatus = document.getElementById('btn-refresh-status');
    const btnQuickIndexModal = document.getElementById('btn-quick-index-modal');

    // Chat Elements
    const chatForm = document.getElementById('chat-form');
    const chatInput = document.getElementById('chat-input');
    const chatMessages = document.getElementById('chat-messages');
    const selectTopK = document.getElementById('select-topk');
    const btnSendChat = document.getElementById('btn-send-chat');
    const inspectorSourcesList = document.getElementById('inspector-sources-list');
    const inspectorChunkCount = document.getElementById('inspector-chunk-count');
    const promptChips = document.querySelectorAll('.chip-btn');

    // Indexer Elements
    const indexingForm = document.getElementById('indexing-form');
    const pdfDropzone = document.getElementById('pdf-dropzone');
    const pdfFileInput = document.getElementById('pdf-file-input');
    const filePreviewPill = document.getElementById('file-preview-pill');
    const fileNameText = document.getElementById('file-name-text');
    const btnRemoveFile = document.getElementById('btn-remove-file');
    const btnUseDsaPdf = document.getElementById('btn-use-dsapdf');
    const btnStartIndexing = document.getElementById('btn-start-indexing');
    
    // Indexer Progress & Log Elements
    const progressFill = document.getElementById('progress-fill');
    const progressPercent = document.getElementById('progress-percent');
    const progressMessage = document.getElementById('progress-message');
    const terminalLog = document.getElementById('terminal-log');
    const indexingStatusBadge = document.getElementById('indexing-status-badge');

    // Tab Titles Map
    const tabMeta = {
        'tab-chat': {
            title: 'AI Q&A Studio (query.js)',
            subtitle: 'Ask questions based on your indexed DSA PDF notes with RAG context.'
        },
        'tab-index': {
            title: 'Knowledge Indexer (index.js)',
            subtitle: 'Load PDF, chunk text with LangChain, embed via Gemini, and save to Pinecone.'
        },
        'tab-stats': {
            title: 'Vector Storage & Document Explorer',
            subtitle: 'Monitor active Pinecone index stats, dimensions, and uploaded workspace PDFs.'
        }
    };

    let selectedFile = null;
    let isIndexingActive = false;

    // Configure Marked.js options
    if (typeof marked !== 'undefined') {
        marked.setOptions({
            highlight: function(code, lang) {
                if (typeof hljs !== 'undefined' && lang && hljs.getLanguage(lang)) {
                    return hljs.highlight(code, { language: lang }).value;
                }
                return code;
            },
            breaks: true
        });
    }

    // 1. Tab Navigation Logic
    navButtons.forEach(btn => {
        btn.addEventListener('click', () => {
            const tabId = btn.getAttribute('data-tab');
            switchTab(tabId);
        });
    });

    function switchTab(tabId) {
        navButtons.forEach(b => b.classList.remove('active'));
        tabContents.forEach(c => c.classList.remove('active'));

        const targetBtn = document.querySelector(`.nav-btn[data-tab="${tabId}"]`);
        const targetTab = document.getElementById(tabId);

        if (targetBtn && targetTab) {
            targetBtn.classList.add('active');
            targetTab.classList.add('active');

            if (tabMeta[tabId]) {
                pageTitle.textContent = tabMeta[tabId].title;
                pageSubtitle.textContent = tabMeta[tabId].subtitle;
            }
        }
    }

    // Quick Index Button from Header
    if (btnQuickIndexModal) {
        btnQuickIndexModal.addEventListener('click', () => {
            switchTab('tab-index');
        });
    }

    // 2. Fetch System & Pinecone Status
    async function refreshSystemStatus() {
        try {
            const res = await fetch('/api/status');
            const data = await res.json();

            if (data.success && data.status === 'online') {
                pineconePulse.classList.add('active');
                statusTitleText.textContent = 'Pinecone Connected';
                sidebarIndexName.textContent = data.indexName || 'new-langchain-index';
                sidebarDim.textContent = `${data.dimension || 768}-d`;

                // Update Stats Tab
                document.getElementById('stat-index-name').textContent = data.indexName || 'new-langchain-index';
                document.getElementById('stat-dimension').textContent = `${data.dimension || 768}`;
                document.getElementById('stat-vector-count').textContent = data.totalRecordCount !== undefined ? data.totalRecordCount.toLocaleString() : 'Ready';
            } else {
                pineconePulse.classList.remove('active');
                statusTitleText.textContent = 'Index Status Check';
            }
        } catch (error) {
            console.error('Status fetch error:', error);
            pineconePulse.classList.remove('active');
            statusTitleText.textContent = 'Server Offline';
        }
    }

    btnRefreshStatus.addEventListener('click', () => {
        refreshSystemStatus();
        fetchDocumentsList();
    });

    // 3. Fetch Workspace Documents List
    async function fetchDocumentsList() {
        try {
            const res = await fetch('/api/documents');
            const data = await res.json();
            const tbody = document.getElementById('docs-table-body');
            tbody.innerHTML = '';

            if (data.success && data.documents && data.documents.length > 0) {
                data.documents.forEach(doc => {
                    const tr = document.createElement('tr');
                    tr.innerHTML = `
                        <td><strong>${doc.name}</strong> ${doc.isDefault ? '<span class="badge-ai">DEFAULT</span>' : ''}</td>
                        <td><code>${doc.path}</code></td>
                        <td>${doc.size}</td>
                        <td>${new Date(doc.modifiedAt).toLocaleString()}</td>
                        <td>
                            <button class="btn btn-outline btn-sm btn-index-row" data-path="${doc.path}">
                                <i class="fa-solid fa-bolt"></i> Index Now
                            </button>
                        </td>
                    `;
                    tbody.appendChild(tr);
                });

                // Attach Row Index Buttons
                document.querySelectorAll('.btn-index-row').forEach(btn => {
                    btn.addEventListener('click', (e) => {
                        const path = e.currentTarget.getAttribute('data-path');
                        switchTab('tab-index');
                        startIndexingJob({ pdfPath: path });
                    });
                });
            } else {
                tbody.innerHTML = `<tr><td colspan="5" class="text-center text-muted">No documents found.</td></tr>`;
            }
        } catch (err) {
            console.error('Error fetching documents:', err);
        }
    }

    // 4. Preset Prompt Chip Handlers
    promptChips.forEach(chip => {
        chip.addEventListener('click', () => {
            const queryText = chip.getAttribute('data-query');
            if (queryText) {
                chatInput.value = queryText;
                submitChatQuery(queryText);
            }
        });
    });

    // 5. Chat Query Submission (query.js execution)
    chatForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const text = chatInput.value.trim();
        if (text) {
            submitChatQuery(text);
        }
    });

    // Handle Shift+Enter for newline, Enter for submit
    chatInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            chatForm.dispatchEvent(new Event('submit'));
        }
    });

    async function submitChatQuery(question) {
        if (btnSendChat.disabled) return;

        const topK = selectTopK.value;
        appendUserMessage(question);
        chatInput.value = '';

        // Add Loading AI Message Bubble
        const aiMessageEl = appendAiLoadingMessage();
        btnSendChat.disabled = true;

        try {
            const res = await fetch('/api/query', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ question, topK })
            });

            const data = await res.json();
            btnSendChat.disabled = false;

            if (data.success) {
                updateAiMessageContent(aiMessageEl, data.answer, data.durationMs);
                updateInspectorSources(data.retrievedDocs);
            } else {
                updateAiMessageError(aiMessageEl, data.error || 'Failed to generate answer.');
            }
        } catch (err) {
            btnSendChat.disabled = false;
            updateAiMessageError(aiMessageEl, 'Connection error with server. Ensure server is running.');
            console.error('Query Error:', err);
        }
    }

    function appendUserMessage(text) {
        const msgDiv = document.createElement('div');
        msgDiv.className = 'message-item message-user';
        msgDiv.innerHTML = `
            <div class="message-avatar"><i class="fa-solid fa-user"></i></div>
            <div class="message-content">
                <div class="message-header">
                    <span class="author">You</span>
                    <span class="time">${new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                </div>
                <div class="message-text">${escapeHtml(text)}</div>
            </div>
        `;
        chatMessages.appendChild(msgDiv);
        chatMessages.scrollTop = chatMessages.scrollHeight;
    }

    function appendAiLoadingMessage() {
        const msgDiv = document.createElement('div');
        msgDiv.className = 'message-item message-system';
        msgDiv.innerHTML = `
            <div class="message-avatar"><i class="fa-solid fa-robot"></i></div>
            <div class="message-content">
                <div class="message-header">
                    <span class="author">DocuMind AI</span>
                    <span class="time"><i class="fa-solid fa-spinner fa-spin"></i> Searching Pinecone & Gemini...</span>
                </div>
                <div class="message-text message-ai-body">
                    <div class="typing-indicator">
                        <span></span><span></span><span></span>
                    </div>
                </div>
            </div>
        `;
        chatMessages.appendChild(msgDiv);
        chatMessages.scrollTop = chatMessages.scrollHeight;
        return msgDiv;
    }

    function updateAiMessageContent(msgEl, answerText, durationMs) {
        const headerTime = msgEl.querySelector('.time');
        const bodyEl = msgEl.querySelector('.message-ai-body');

        if (headerTime) {
            headerTime.innerHTML = `<i class="fa-solid fa-clock"></i> ${(durationMs / 1000).toFixed(2)}s`;
        }

        if (typeof marked !== 'undefined') {
            bodyEl.innerHTML = marked.parse(answerText);
            if (typeof hljs !== 'undefined') {
                bodyEl.querySelectorAll('pre code').forEach((block) => {
                    hljs.highlightElement(block);
                });
            }
        } else {
            bodyEl.textContent = answerText;
        }

        chatMessages.scrollTop = chatMessages.scrollHeight;
    }

    function updateAiMessageError(msgEl, errorMsg) {
        const headerTime = msgEl.querySelector('.time');
        const bodyEl = msgEl.querySelector('.message-ai-body');

        if (headerTime) {
            headerTime.innerHTML = `<span class="text-rose"><i class="fa-solid fa-triangle-exclamation"></i> Error</span>`;
        }
        bodyEl.innerHTML = `<div class="text-rose">${escapeHtml(errorMsg)}</div>`;
    }

    // Update Right Drawer Inspector with Retrieved Context
    function updateInspectorSources(docs) {
        inspectorSourcesList.innerHTML = '';
        if (!docs || docs.length === 0) {
            inspectorChunkCount.textContent = '0 Chunks';
            inspectorSourcesList.innerHTML = `<div class="empty-inspector"><p>No context passages found.</p></div>`;
            return;
        }

        inspectorChunkCount.textContent = `${docs.length} Chunks Match`;

        docs.forEach((doc, idx) => {
            const card = document.createElement('div');
            card.className = 'chunk-card';
            card.innerHTML = `
                <div class="chunk-header">
                    <span><i class="fa-solid fa-cube"></i> Pinecone Match #${idx + 1}</span>
                    <span>Page ${doc.metadata?.loc?.pageNumber || doc.metadata?.page || 1}</span>
                </div>
                <div class="chunk-text">${escapeHtml(doc.pageContent)}</div>
            `;
            inspectorSourcesList.appendChild(card);
        });
    }

    // 6. Indexing PDF Handling & File Drag Drop
    pdfDropzone.addEventListener('click', () => pdfFileInput.click());

    ['dragenter', 'dragover'].forEach(eventName => {
        pdfDropzone.addEventListener(eventName, (e) => {
            e.preventDefault();
            pdfDropzone.classList.add('dragover');
        }, false);
    });

    ['dragleave', 'drop'].forEach(eventName => {
        pdfDropzone.addEventListener(eventName, (e) => {
            e.preventDefault();
            pdfDropzone.classList.remove('dragover');
        }, false);
    });

    pdfDropzone.addEventListener('drop', (e) => {
        const dt = e.dataTransfer;
        const files = dt.files;
        if (files && files.length > 0) {
            handleFileSelect(files[0]);
        }
    });

    pdfFileInput.addEventListener('change', (e) => {
        if (e.target.files && e.target.files.length > 0) {
            handleFileSelect(e.target.files[0]);
        }
    });

    function handleFileSelect(file) {
        if (!file.name.endsWith('.pdf')) {
            alert('Please select a valid PDF file.');
            return;
        }
        selectedFile = file;
        fileNameText.textContent = `${file.name} (${(file.size / 1024 / 1024).toFixed(2)} MB)`;
        filePreviewPill.classList.remove('hidden');
    }

    btnRemoveFile.addEventListener('click', (e) => {
        e.stopPropagation();
        selectedFile = null;
        pdfFileInput.value = '';
        filePreviewPill.classList.add('hidden');
    });

    btnUseDsaPdf.addEventListener('click', () => {
        selectedFile = null;
        pdfFileInput.value = '';
        filePreviewPill.classList.add('hidden');
        startIndexingJob({ pdfPath: './dsa.pdf' });
    });

    indexingForm.addEventListener('submit', (e) => {
        e.preventDefault();
        if (selectedFile) {
            startIndexingJob({ file: selectedFile });
        } else {
            startIndexingJob({ pdfPath: './dsa.pdf' });
        }
    });

    // 7. Start SSE Real-Time Document Indexing (index.js execution)
    function startIndexingJob(params) {
        if (isIndexingActive) return;

        isIndexingActive = true;
        btnStartIndexing.disabled = true;
        indexingStatusBadge.textContent = 'Processing';
        indexingStatusBadge.className = 'badge-status warning';

        resetStepper();
        logTerminal('[System] Starting Indexing Pipeline...', 'info');

        const formData = new FormData();
        if (params.file) {
            formData.append('pdfFile', params.file);
            logTerminal(`[Uploader] Uploading PDF: ${params.file.name}`, 'info');
        } else if (params.pdfPath) {
            formData.append('pdfPath', params.pdfPath);
            logTerminal(`[Loader] Targeting Workspace PDF: ${params.pdfPath}`, 'info');
        }

        formData.append('chunkSize', document.getElementById('chunk-size').value || '2500');
        formData.append('chunkOverlap', document.getElementById('chunk-overlap').value || '250');

        fetch('/api/index-sse', {
            method: 'POST',
            body: formData
        }).then(response => {
            const reader = response.body.getReader();
            const decoder = new TextDecoder();
            let buffer = '';

            function readStream() {
                reader.read().then(({ done, value }) => {
                    if (done) {
                        finishIndexingJob();
                        return;
                    }

                    buffer += decoder.decode(value, { stream: true });
                    const lines = buffer.split('\n\n');
                    buffer = lines.pop(); // Keep incomplete snippet

                    lines.forEach(line => {
                        if (line.trim()) {
                            parseSSEMessage(line);
                        }
                    });

                    readStream();
                }).catch(err => {
                    logTerminal(`[Error] Stream error: ${err.message}`, 'error');
                    finishIndexingJob(false);
                });
            }

            readStream();
        }).catch(err => {
            logTerminal(`[Error] Fetch failed: ${err.message}`, 'error');
            finishIndexingJob(false);
        });
    }

    function parseSSEMessage(rawBlock) {
        const lines = rawBlock.split('\n');
        let event = 'message';
        let dataStr = '';

        lines.forEach(l => {
            if (l.startsWith('event: ')) event = l.substring(7).trim();
            if (l.startsWith('data: ')) dataStr = l.substring(6).trim();
        });

        if (!dataStr) return;
        try {
            const data = JSON.parse(dataStr);

            if (event === 'progress') {
                updateProgressUI(data.percent, data.message);
                logTerminal(`[Progress ${data.percent}%] ${data.message}`, 'info');
                updateStepperByStep(data.step);
            } else if (event === 'status') {
                updateProgressUI(data.percent, data.message);
                logTerminal(`[Status] ${data.message}`, 'info');
            } else if (event === 'complete') {
                updateProgressUI(100, `Complete! Stored in Pinecone.`);
                logTerminal(`[Success] 🎉 ${data.message || 'Indexing completed!'}`, 'success');
                setStepCompleted(1); setStepCompleted(2); setStepCompleted(3); setStepCompleted(4);
                refreshSystemStatus();
                finishIndexingJob(true);
            } else if (event === 'error') {
                logTerminal(`[Failure] ❌ ${data.error}`, 'error');
                finishIndexingJob(false);
            }
        } catch (e) {
            console.error('SSE parse error:', e);
        }
    }

    function updateProgressUI(pct, msg) {
        progressFill.style.width = `${pct}%`;
        progressPercent.textContent = `${pct}%`;
        if (msg) progressMessage.textContent = msg;
    }

    function updateStepperByStep(step) {
        if (step === 'LOAD_PDF') { setStepActive(1); }
        if (step === 'LOAD_PDF_COMPLETE') { setStepCompleted(1); }
        if (step === 'CHUNKING') { setStepActive(2); }
        if (step === 'CHUNKING_COMPLETE') { setStepCompleted(2); }
        if (step === 'EMBEDDING_PROGRESS') { setStepCompleted(2); setStepActive(3); }
        if (step === 'UPSERTING') { setStepCompleted(3); setStepActive(4); }
    }

    function resetStepper() {
        for (let i = 1; i <= 4; i++) {
            const el = document.getElementById(`step-${i}`);
            if (el) { el.classList.remove('active', 'completed'); }
        }
        progressFill.style.width = '0%';
        progressPercent.textContent = '0%';
        progressMessage.textContent = 'Starting process...';
    }

    function setStepActive(num) {
        const el = document.getElementById(`step-${num}`);
        if (el) { el.classList.remove('completed'); el.classList.add('active'); }
    }

    function setStepCompleted(num) {
        const el = document.getElementById(`step-${num}`);
        if (el) { el.classList.remove('active'); el.classList.add('completed'); }
    }

    function finishIndexingJob(success = true) {
        isIndexingActive = false;
        btnStartIndexing.disabled = false;
        if (success) {
            indexingStatusBadge.textContent = 'Completed';
            indexingStatusBadge.className = 'badge-status success';
        } else {
            indexingStatusBadge.textContent = 'Failed';
            indexingStatusBadge.className = 'badge-status error';
        }
    }

    function logTerminal(text, type = 'info') {
        const line = document.createElement('div');
        line.className = `terminal-line ${type}`;
        line.textContent = `[${new Date().toLocaleTimeString()}] ${text}`;
        terminalLog.appendChild(line);
        terminalLog.scrollTop = terminalLog.scrollHeight;
    }

    function escapeHtml(text) {
        if (!text) return '';
        return text
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;")
            .replace(/'/g, "&#039;");
    }

    // Initial Load Calls
    refreshSystemStatus();
    fetchDocumentsList();
});
