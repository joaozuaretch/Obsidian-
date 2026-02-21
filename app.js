// Initialize Lucide icons
lucide.createIcons();

const fileExplorer = document.getElementById('file-explorer');
const viewerContainer = document.getElementById('viewer-container');
const activeFileTitle = document.getElementById('active-file-title');
const breadcrumb = document.getElementById('breadcrumb');
const refreshBtn = document.getElementById('refresh-btn');

// Configure marked.js
marked.setOptions({
    highlight: function (code, lang) {
        const language = hljs.getLanguage(lang) ? lang : 'plaintext';
        return hljs.highlight(code, { language }).value;
    },
    langPrefix: 'hljs language-',
    breaks: true,
    gfm: true
});

// State
let currentPath = '';

// Fetch and render file tree
async function fetchFiles() {
    fileExplorer.innerHTML = '<div class="loading">Carregando arquivos...</div>';
    try {
        const response = await fetch('/api/files');
        const files = await response.json();
        renderFileTree(files, fileExplorer);
    } catch (error) {
        console.error('Error fetching files:', error);
        fileExplorer.innerHTML = '<div class="loading">Erro ao carregar arquivos.</div>';
    }
}

function renderFileTree(files, container) {
    container.innerHTML = '';
    if (files.length === 0) {
        container.innerHTML = '<div class="loading">Nenhum arquivo encontrado no vault.</div>';
        return;
    }

    files.forEach(file => {
        const item = document.createElement('div');
        item.className = 'tree-item';

        const self = document.createElement('div');
        self.className = 'tree-item-self';
        self.dataset.path = file.path;

        const icon = document.createElement('i');
        icon.className = 'tree-item-icon';
        const iconName = file.isDir ? 'folder' : (file.name.endsWith('.pdf') ? 'file-digit' : 'file-text');
        icon.setAttribute('data-lucide', iconName);

        const name = document.createElement('span');
        name.className = 'tree-item-name';
        name.textContent = file.name;

        self.appendChild(icon);
        self.appendChild(name);
        item.appendChild(self);

        if (file.isDir) {
            const childrenContainer = document.createElement('div');
            childrenContainer.className = 'tree-item-children collapsed';
            renderFileTree(file.children, childrenContainer);
            item.appendChild(childrenContainer);

            self.addEventListener('click', (e) => {
                e.stopPropagation();
                childrenContainer.classList.toggle('collapsed');
                icon.setAttribute('data-lucide', childrenContainer.classList.contains('collapsed') ? 'folder' : 'folder-open');
                lucide.createIcons({ attrs: { "data-lucide": icon.dataset.lucide }, nameAttr: "data-lucide" });
            });
        } else {
            self.addEventListener('click', (e) => {
                e.stopPropagation();
                // Deactivate previous active item
                document.querySelectorAll('.tree-item-self.active').forEach(el => el.classList.remove('active'));
                self.classList.add('active');
                loadFile(file);
            });
        }

        container.appendChild(item);
    });

    lucide.createIcons();
}

async function loadFile(file) {
    activeFileTitle.textContent = file.name;
    updateBreadcrumb(file.path);
    viewerContainer.innerHTML = '<div class="loading">Carregando conteúdo...</div>';

    try {
        if (file.name.toLowerCase().endswith('.md')) {
            const response = await fetch('/' + file.path);
            const text = await response.text();
            renderMarkdown(text);
        } else if (file.name.toLowerCase().endswith('.pdf')) {
            renderPDF(file.path);
        }
    } catch (error) {
        console.error('Error loading file:', error);
        viewerContainer.innerHTML = `<div class="loading">Erro ao carregar o arquivo: ${file.name}</div>`;
    }
}

function renderMarkdown(md) {
    const htmlContent = marked.parse(md);
    viewerContainer.innerHTML = `<div class="markdown-body">${htmlContent}</div>`;
    // Apply highlighting for code blocks after rendering
    viewerContainer.querySelectorAll('pre code').forEach((block) => {
        hljs.highlightElement(block);
    });
}

function renderPDF(path) {
    // We use a simple iframe/embed if the browser supports it, or a viewer fallback
    const pdfUrl = '/' + path;
    viewerContainer.innerHTML = `
        <object data="${pdfUrl}" type="application/pdf" class="pdf-viewer">
            <p>Seu navegador não consegue exibir PDFs. <a href="${pdfUrl}" target="_blank">Clique aqui para baixar</a>.</p>
        </object>
    `;
}

function updateBreadcrumb(path) {
    const parts = path.split('/');
    breadcrumb.innerHTML = '';

    parts.forEach((part, index) => {
        const span = document.createElement('span');
        span.textContent = part;
        breadcrumb.appendChild(span);

        if (index < parts.length - 1) {
            const separator = document.createElement('span');
            separator.textContent = ' / ';
            separator.style.opacity = '0.3';
            breadcrumb.appendChild(separator);
        }
    });
}

// polyfill for string.endswith (lower and upper case check)
if (!String.prototype.endswith) {
    String.prototype.endswith = function (suffix) {
        return this.toLowerCase().indexOf(suffix.toLowerCase(), this.length - suffix.length) !== -1;
    };
}

refreshBtn.addEventListener('click', fetchFiles);

// Initial load
fetchFiles();
