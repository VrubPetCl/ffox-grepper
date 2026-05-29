(function() {
  if (window.__wde_injected) return;
  window.__wde_injected = true;

  class WebDataExtractor {
    constructor() {
      this.uiContainer = null;
      this.shadowRoot = null;
      this.isVisible = false;
      this.selectingMode = null; // 'iteration' or column id
      this.iterationPath = [];
      this.iterationSelector = '';
      this.columns = [];
      this.hoveredElement = null;

      this.bindEvents();
      this.initMessages();
    }

    bindEvents() {
      this.handleMouseOver = this.handleMouseOver.bind(this);
      this.handleMouseOut = this.handleMouseOut.bind(this);
      this.handleClick = this.handleClick.bind(this);
      this.handleKeyDown = this.handleKeyDown.bind(this);

      document.addEventListener('mouseover', this.handleMouseOver, true);
      document.addEventListener('mouseout', this.handleMouseOut, true);
      document.addEventListener('click', this.handleClick, true);
      document.addEventListener('keydown', this.handleKeyDown, true);
    }

    initMessages() {
      if (typeof chrome !== 'undefined' && chrome.runtime?.onMessage) {
        chrome.runtime.onMessage.addListener((request) => {
          if (request.action === "toggle_ui") this.toggleUI();
        });
      }
      window.__wde_toggle = () => this.toggleUI();
    }

    toggleUI() {
      if (!this.uiContainer) this.createUI();
      
      this.isVisible = !this.isVisible;
      this.uiContainer.style.display = this.isVisible ? "block" : "none";
      
      if (this.isVisible) {
        this.render();
        setTimeout(() => {
          const iterInput = this.shadowRoot.querySelector('input[data-id="iter-input"]');
          if (iterInput) iterInput.focus();
        }, 0);
      } else {
        this.cancelSelection();
      }
    }

    createUI() {
      this.uiContainer = document.createElement('div');
      this.uiContainer.id = "wde-root";
      Object.assign(this.uiContainer.style, {
        position: "fixed", top: "20px", right: "20px", width: "500px",
        maxHeight: "90vh", overflowY: "auto", zIndex: "2147483647", display: "none"
      });
      
      this.shadowRoot = this.uiContainer.attachShadow({ mode: 'open' });
      
      const style = document.createElement('style');
      style.textContent = this.getCSS();
      this.shadowRoot.appendChild(style);

      const content = document.createElement('div');
      content.id = 'content';
      this.shadowRoot.appendChild(content);

      document.body.appendChild(this.uiContainer);
    }

    getCSS() {
      return `
        :host { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; background: #1e1e1e; color: #ffffff; border-radius: 12px; box-shadow: 0 10px 40px rgba(0,0,0,0.6); padding: 20px; box-sizing: border-box; }
        * { box-sizing: border-box; }
        .header { display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid #333; padding-bottom: 12px; margin-bottom: 20px; }
        h2 { margin: 0; font-size: 20px; font-weight: 600; color: #fff; }
        .close-btn { background: transparent; border: none; color: #888; font-size: 24px; cursor: pointer; padding: 0 4px; line-height: 1; transition: color 0.2s; }
        .close-btn:hover { color: #fff; }
        button { background: #3a3a3a; color: #fff; border: 1px solid #555; border-radius: 4px; padding: 8px 16px; cursor: pointer; font-size: 13px; transition: background 0.2s, border-color 0.2s; height: 36px; display: flex; align-items: center; justify-content: center; }
        button:hover { background: #4a4a4a; border-color: #666; }
        button.primary { background: #0e639c; border-color: #1177bb; }
        button.primary:hover { background: #1177bb; }
        .section { margin-bottom: 24px; background: #252526; padding: 16px; border-radius: 8px; border: 1px solid #333; }
        .section-title { font-weight: 600; margin-bottom: 12px; font-size: 14px; color: #ccc; }
        .path-buttons { display: flex; flex-wrap: wrap; gap: 6px; margin-top: 12px; }
        .path-btn { background: #333; border: 1px solid #444; color: #bbb; padding: 0 8px; border-radius: 4px; font-size: 11px; cursor: pointer; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; max-width: 160px; height: 24px; }
        .path-btn:hover { background: #444; color: #fff; border-color: #666; }
        .column { background: #2d2d2d; border: 1px solid #444; padding: 12px; border-radius: 6px; margin-bottom: 12px; position: relative; }
        .column-del-btn { position: absolute; top: 8px; right: 8px; background: transparent; border: none; color: #555; font-size: 14px; cursor: pointer; padding: 4px; line-height: 1; transition: color 0.2s; height: auto; width: auto; display: flex; align-items: center; justify-content: center; }
        .column-del-btn:hover { color: #ff4d4d; }
        .column:last-child { margin-bottom: 0; }
        .column-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px; }
        input, select { background: #3c3c3c; color: #fff; border: 1px solid #555; padding: 0 12px; border-radius: 4px; width: 100%; font-size: 13px; height: 36px; transition: border-color 0.2s; }
        input:focus, select:focus { outline: none; border-color: #0e639c; }
        input::placeholder { color: #777; }
        .row { display: flex; gap: 10px; align-items: center; margin-bottom: 10px; }
        .row:last-child { margin-bottom: 0; }
        .row > * { flex: 1; }
        .row > button { flex: 0 0 auto; }
        .results { margin-top: 24px; overflow-x: auto; }
        .results table { width: 100%; border-collapse: collapse; font-size: 12px; margin-top: 12px; }
        .results th, .results td { border: 1px solid #444; padding: 8px; text-align: left; max-width: 180px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
        .results th { background: #333; font-weight: 600; color: #aaa; }
        .actions { display: flex; gap: 10px; margin-top: 12px; }
        .template-actions { display: flex; gap: 10px; margin-top: 24px; border-top: 1px solid #333; padding-top: 20px; padding-bottom: 4px; }
        #content { padding: 1rem; }
      `;
    }

    getElementPath(el) {
      const path = [];
      let current = el;
      while (current && current !== document) {
        let selector = current.tagName.toLowerCase();
        if (current.id) selector += '#' + CSS.escape(current.id);
        if (current.className && typeof current.className === 'string') {
          const classes = current.className.trim().split(/\s+/).filter(c => c && !c.startsWith('wde-'));
          if (classes.length > 0) selector += '.' + classes.map(c => CSS.escape(c)).join('.');
        }
        path.unshift(selector);
        current = current.parentNode;
      }
      return path;
    }

    getRelativeSelector(parent, child) {
      if (parent === child) return "";
      const path = [];
      let current = child;
      while (current && current !== parent && current !== document) {
        let selector = current.tagName.toLowerCase();
        if (current.id) selector += '#' + CSS.escape(current.id);
        if (current.className && typeof current.className === 'string') {
          const classes = current.className.trim().split(/\s+/).filter(c => c && !c.startsWith('wde-'));
          if (classes.length > 0) selector += '.' + classes.map(c => CSS.escape(c)).join('.');
        }
        path.unshift(selector);
        current = current.parentNode;
      }
      return path.join(' > ');
    }

    handleMouseOver(e) {
      if (!this.selectingMode || this.uiContainer.contains(e.target)) return;
      if (this.hoveredElement) this.hoveredElement.classList.remove('wde-highlight');
      this.hoveredElement = e.target;
      this.hoveredElement.classList.add('wde-highlight');
    }

    handleMouseOut() {
      if (!this.selectingMode || !this.hoveredElement) return;
      this.hoveredElement.classList.remove('wde-highlight');
      this.hoveredElement = null;
    }

    handleClick(e) {
      if (!this.selectingMode || this.uiContainer.contains(e.target)) return;

      e.preventDefault();
      e.stopPropagation();

      if (this.hoveredElement) {
        this.hoveredElement.classList.remove('wde-highlight');
      }

      const target = e.target;
      if (this.selectingMode === 'iteration') {
        this.iterationPath = this.getElementPath(target);
        this.iterationSelector = this.iterationPath.join(' ');
      } else {
        const col = this.columns.find(c => c.id === this.selectingMode);
        if (col) {
          if (this.iterationSelector) {
            const closestIter = target.closest(this.iterationSelector);
            col.selector = closestIter ? (this.getRelativeSelector(closestIter, target) || ":scope") : this.getRelativeSelector(document.body, target);
          } else {
            col.selector = this.getRelativeSelector(document.body, target);
          }
        }
      }

      this.selectingMode = null;
      document.body.classList.remove('wde-selecting');
      this.uiContainer.style.display = "block";
      this.render();

      setTimeout(() => {
        const addBtn = this.shadowRoot.querySelector('button[data-action="add-column"]');
        if (addBtn) addBtn.focus();
      }, 0);
    }

    handleKeyDown(e) {
      if (e.key === 'Escape' && this.isVisible) {
        this.toggleUI();
      }
    }

    startSelecting(mode) {
      this.selectingMode = mode;
      this.uiContainer.style.display = "none";
      document.body.classList.add('wde-selecting');
    }

    cancelSelection() {
      this.selectingMode = null;
      document.body.classList.remove('wde-selecting');
      if (this.hoveredElement) {
        this.hoveredElement.classList.remove('wde-highlight');
        this.hoveredElement = null;
      }
    }

    render() {
      if (!this.shadowRoot) return;
      const content = this.shadowRoot.getElementById('content');
      content.innerHTML = '';
      
      content.appendChild(this.createElement('div', { className: 'header' }, [
        this.createElement('h2', { textContent: 'Web Data Extractor' }),
        this.createElement('button', { className: 'close-btn', innerHTML: '&times;', onclick: () => this.toggleUI() })
      ]));

      const iterSection = this.createElement('div', { className: 'section' }, [
        this.createElement('div', { className: 'section-title', textContent: 'Iteration Target' }),
        this.createElement('div', { className: 'row' }, [
          this.createElement('input', { 
            value: this.iterationSelector, 
            placeholder: 'Iteration CSS Selector', 
            dataset: { id: 'iter-input' },
            oninput: (e) => { this.iterationSelector = e.target.value; this.iterationPath = []; this.render(); }
          }),
          this.createElement('button', { textContent: 'Select Target', onclick: () => this.startSelecting('iteration') })
        ])
      ]);

      if (this.iterationPath.length > 0) {
        const pathButtons = this.iterationPath.map((part, index) => {
          const selector = this.iterationPath.slice(0, index + 1).join(' ');
          return this.createElement('button', {
            className: 'path-btn',
            textContent: `[${part}]`,
            title: selector,
            onmouseover: () => {
              try { document.querySelectorAll(selector).forEach(el => el.classList.add('wde-highlight-secondary')); } catch (e) {}
            },
            onmouseout: () => {
              try { document.querySelectorAll(selector).forEach(el => el.classList.remove('wde-highlight-secondary')); } catch (e) {}
            },
            onclick: () => {
              this.iterationPath = this.iterationPath.slice(0, index + 1);
              this.iterationSelector = this.iterationPath.join(' ');
              this.render();
            }
          });
        });
        iterSection.appendChild(this.createElement('div', { className: 'path-buttons' }, pathButtons));
      }
      content.appendChild(iterSection);

      const colsSection = this.createElement('div', { className: 'section' }, [
        this.createElement('div', { className: 'column-header' }, [
          this.createElement('div', { className: 'section-title', style: { marginBottom: '0' }, textContent: 'Columns' }),
          this.createElement('button', { 
            textContent: '+ Add Column', 
            dataset: { action: 'add-column' },
            onclick: () => {
              const id = Date.now().toString();
              this.columns.push({ id, name: `Col ${this.columns.length + 1}`, selector: '', type: 'innerText', dataKey: '' });
              this.render();
              setTimeout(() => {
                const newColInput = this.shadowRoot.querySelector(`input[data-col-id="${id}"]`);
                if (newColInput) newColInput.focus();
              }, 0);
            }
          })
        ])
      ]);

      this.columns.forEach((col, index) => {
        const typeSelectOptions = ['innerText', 'innerHTML', 'href', 'data'].map(t => 
          this.createElement('option', { value: t, textContent: t, selected: col.type === t })
        );
        
        const row3Children = [
          this.createElement('select', { 
            onchange: (e) => { col.type = e.target.value; this.render(); } 
          }, typeSelectOptions)
        ];

        if (col.type === 'data') {
          row3Children.push(this.createElement('input', {
            value: col.dataKey,
            placeholder: 'data-???',
            oninput: (e) => col.dataKey = e.target.value
          }));
        }

        colsSection.appendChild(this.createElement('div', { className: 'column' }, [
          this.createElement('button', { 
            className: 'column-del-btn', 
            innerHTML: '&times;', 
            tabIndex: -1, 
            title: 'Remove Column', 
            onclick: () => { this.columns.splice(index, 1); this.render(); } 
          }),
          this.createElement('div', { className: 'row' }, [
            this.createElement('input', { 
              value: col.name, 
              placeholder: 'Column Name', 
              dataset: { colId: col.id },
              oninput: (e) => col.name = e.target.value,
              onfocus: (e) => e.target.select()
            })
          ]),
          this.createElement('div', { className: 'row' }, [
            this.createElement('button', { textContent: 'Select', onclick: () => this.startSelecting(col.id) }),
            this.createElement('input', { 
              value: col.selector, 
              placeholder: 'CSS Selector', 
              oninput: (e) => col.selector = e.target.value 
            })
          ]),
          this.createElement('div', { className: 'row' }, row3Children)
        ]));
      });
      content.appendChild(colsSection);

      if (this.iterationSelector && this.columns.length > 0) {
        content.appendChild(this.createElement('div', { className: 'section' }, [
          this.createElement('button', { 
            className: 'primary', 
            textContent: 'Grab Data', 
            style: { width: '100%' }, 
            onclick: () => this.performGrab() 
          })
        ]));
      }

      content.appendChild(this.createElement('div', { className: 'template-actions' }, [
        this.createElement('button', { textContent: 'Save Template', onclick: () => this.saveTemplate() }),
        this.createElement('button', { textContent: 'Load Template', onclick: () => this.loadTemplate() })
      ]));
    }

    createElement(tag, props = {}, children = []) {
      const el = document.createElement(tag);
      for (const [key, val] of Object.entries(props)) {
        if (key.startsWith('on') && typeof val === 'function') {
          el.addEventListener(key.slice(2).toLowerCase(), val);
        } else if (key === 'style' && typeof val === 'object') {
          Object.assign(el.style, val);
        } else if (key === 'dataset') {
          Object.entries(val).forEach(([dKey, dVal]) => el.dataset[dKey] = dVal);
        } else if (key in el) {
          el[key] = val;
        } else {
          el.setAttribute(key, val);
        }
      }
      children.forEach(child => {
        if (child == null) return;
        if (typeof child === 'string' || typeof child === 'number') {
          el.appendChild(document.createTextNode(String(child)));
        } else if (child instanceof Node) {
          el.appendChild(child);
        }
      });
      return el;
    }

    performGrab() {
      if (!this.iterationSelector) return;
      let elements;
      try {
        elements = document.querySelectorAll(this.iterationSelector);
      } catch (e) {
        alert('Invalid iteration selector');
        return;
      }

      const data = Array.from(elements).map(el => {
        const rowData = {};
        this.columns.forEach(col => {
          let targetEl = el;
          if (col.selector && col.selector !== ":scope") {
            try {
              targetEl = el.querySelector(col.selector);
            } catch (e) {
              targetEl = null;
            }
          }
          let val = '';
          if (targetEl) {
            switch (col.type) {
              case 'innerText': val = targetEl.innerText || ''; break;
              case 'innerHTML': val = targetEl.innerHTML || ''; break;
              case 'href': val = targetEl.href || targetEl.getAttribute('href') || ''; break;
              case 'data': val = targetEl.getAttribute(col.dataKey || '') || ''; break;
            }
          }
          rowData[col.name] = val.trim();
        });
        return rowData;
      });
      this.showResults(data);
    }

    showResults(data) {
      const content = this.shadowRoot.getElementById('content');
      let resSection = this.shadowRoot.getElementById('results-section');
      if (resSection) resSection.remove();
      
      resSection = this.createElement('div', { id: 'results-section', className: 'section results' }, [
        this.createElement('div', {}, [
          this.createElement('strong', { textContent: `Extracted ${data.length} rows` })
        ])
      ]);

      if (data.length > 0) {
        const table = this.createElement('table', {}, [
          this.createElement('thead', {}, [
            this.createElement('tr', {}, Object.keys(data[0]).map(key => this.createElement('th', { textContent: key })))
          ]),
          this.createElement('tbody', {}, data.slice(0, 5).map(row => 
            this.createElement('tr', {}, Object.values(row).map(val => this.createElement('td', { textContent: val })))
          ))
        ]);
        resSection.appendChild(table);

        if (data.length > 5) {
          resSection.appendChild(this.createElement('div', { 
            style: { fontSize: '10px', color: '#888', marginTop: '4px' }, 
            textContent: `... and ${data.length - 5} more rows.` 
          }));
        }
      }

      resSection.appendChild(this.createElement('div', { className: 'actions' }, [
        this.createElement('button', { textContent: 'Download CSV', onclick: () => this.downloadCSV(data) }),
        this.createElement('button', { textContent: 'Download JSON', onclick: () => this.downloadJSON(data) })
      ]));

      content.appendChild(resSection);
    }

    async saveTemplate() {
      const name = prompt('Template Name:', window.location.hostname);
      if (!name) return;
      
      const template = { iterationSelector: this.iterationSelector, columns: this.columns };
      if (chrome?.storage?.local) {
        const data = await chrome.storage.local.get('wde_templates') || {};
        const templates = data.wde_templates || {};
        templates[name] = template;
        await chrome.storage.local.set({ wde_templates: templates });
        alert('Template saved!');
      } else {
        alert('Storage API not available');
      }
    }

    async loadTemplate() {
      if (chrome?.storage?.local) {
        const data = await chrome.storage.local.get('wde_templates');
        const templates = data.wde_templates || {};
        const names = Object.keys(templates);
        if (names.length === 0) {
          alert('No templates saved');
          return;
        }
        const name = prompt(`Select Template:\n${names.join('\n')}`);
        if (name && templates[name]) {
          const template = templates[name];
          this.iterationSelector = template.iterationSelector;
          this.columns = template.columns;
          this.iterationPath = []; 
          this.render();
        }
      } else {
        alert('Storage API not available');
      }
    }

    getExportFileName(ext) {
      const now = new Date();
      const pad = (n) => String(n).padStart(2, '0');
      const timestamp = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}_${pad(now.getHours())}-${pad(now.getMinutes())}-${pad(now.getSeconds())}`;
      const title = (document.title || 'extracted_data').replace(/[^a-z0-9]/gi, '_').replace(/_{2,}/g, '_').toLowerCase().substring(0, 50);
      return `${timestamp}-${title}.${ext}`;
    }

    downloadJSON(data) {
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      this.triggerDownload(blob, this.getExportFileName('json'));
    }

    downloadCSV(data) {
      if (data.length === 0) return;
      const headers = Object.keys(data[0]);
      const csvContent = [
        headers.join(','),
        ...data.map(row => headers.map(h => `"${String(row[h] || '').replace(/"/g, '""')}"`).join(','))
      ].join('\n');
      const blob = new Blob([csvContent], { type: 'text/csv' });
      this.triggerDownload(blob, this.getExportFileName('csv'));
    }

    triggerDownload(blob, filename) {
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      a.click();
      URL.revokeObjectURL(url);
    }
  }

  new WebDataExtractor();
})();