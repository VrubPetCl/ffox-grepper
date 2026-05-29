(function() {
  if (window.__wde_injected) return;
  window.__wde_injected = true;
  let uiContainer = null;
  let shadowRoot = null;
  let isVisible = false;
  let selectingMode = null; // 'iteration', or column id
  let iterationPath = [];
  let iterationSelector = '';
  let columns = [];
  let hoveredElement = null;

  // Listen for toggle
  if (typeof chrome !== 'undefined' && chrome.runtime && chrome.runtime.onMessage) {
    chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
      if (request.action === "toggle_ui") {
        toggleUI();
      }
    });
  }

  // Expose toggleUI for testing
  window.__wde_toggle = toggleUI;

  function toggleUI() {
    if (!uiContainer) {
      createUI();
    }
    isVisible = !isVisible;
    uiContainer.style.display = isVisible ? "block" : "none";
    if (isVisible) {
      render();
      // Auto-focus iteration input on open
      setTimeout(() => {
        const iterInput = shadowRoot.querySelector('input[data-id="iter-input"]');
        if (iterInput) iterInput.focus();
      }, 0);
    } else {
      cancelSelection();
    }
  }

  function createUI() {
    uiContainer = document.createElement('div');
    uiContainer.id = "wde-root";
    uiContainer.style.position = "fixed";
    uiContainer.style.top = "20px";
    uiContainer.style.right = "20px";
    uiContainer.style.width = "500px";
    uiContainer.style.maxHeight = "90vh";
    uiContainer.style.overflowY = "auto";
    uiContainer.style.zIndex = "2147483647";
    uiContainer.style.display = "none";
    shadowRoot = uiContainer.attachShadow({ mode: 'open' });

    const style = document.createElement('style');
    style.textContent = `
      :host {
        font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
        background: #1e1e1e;
        color: #ffffff;
        border-radius: 12px;
        box-shadow: 0 10px 40px rgba(0,0,0,0.6);
        padding: 20px;
        box-sizing: border-box;
      }
      * {
        box-sizing: border-box;
      }
      .header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        border-bottom: 1px solid #333;
        padding-bottom: 12px;
        margin-bottom: 20px;
      }
      h2 {
        margin: 0;
        font-size: 20px;
        font-weight: 600;
        color: #fff;
      }
      .close-btn {
        background: transparent;
        border: none;
        color: #888;
        font-size: 24px;
        cursor: pointer;
        padding: 0 4px;
        line-height: 1;
        transition: color 0.2s;
      }
      .close-btn:hover {
        color: #fff;
      }
      button {
        background: #3a3a3a;
        color: #fff;
        border: 1px solid #555;
        border-radius: 4px;
        padding: 8px 16px;
        cursor: pointer;
        font-size: 13px;
        transition: background 0.2s, border-color 0.2s;
        height: 36px;
        display: flex;
        align-items: center;
        justify-content: center;
      }
      button:hover {
        background: #4a4a4a;
        border-color: #666;
      }
      button.primary {
        background: #0e639c;
        border-color: #1177bb;
      }
      button.primary:hover {
        background: #1177bb;
      }
      .section {
        margin-bottom: 24px;
        background: #252526;
        padding: 16px;
        border-radius: 8px;
        border: 1px solid #333;
      }
      .section-title {
        font-weight: 600;
        margin-bottom: 12px;
        font-size: 14px;
        color: #ccc;
      }
      .path-buttons {
        display: flex;
        flex-wrap: wrap;
        gap: 6px;
        margin-top: 12px;
      }
      .path-btn {
        background: #333;
        border: 1px solid #444;
        color: #bbb;
        padding: 0 8px;
        border-radius: 4px;
        font-size: 11px;
        cursor: pointer;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
        max-width: 160px;
        height: 24px;
      }
      .path-btn:hover {
        background: #444;
        color: #fff;
        border-color: #666;
      }
      .column {
        background: #2d2d2d;
        border: 1px solid #444;
        padding: 12px;
        border-radius: 6px;
        margin-bottom: 12px;
        position: relative;
      }
      .column-del-btn {
        position: absolute;
        top: 8px;
        right: 8px;
        background: transparent;
        border: none;
        color: #555;
        font-size: 14px;
        cursor: pointer;
        padding: 4px;
        line-height: 1;
        transition: color 0.2s;
        height: auto;
        width: auto;
        display: flex;
        align-items: center;
        justify-content: center;
      }
      .column-del-btn:hover {
        color: #ff4d4d;
      }
      .column:last-child {
        margin-bottom: 0;
      }
      .column-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 16px;
      }
      input, select {
        background: #3c3c3c;
        color: #fff;
        border: 1px solid #555;
        padding: 0 12px;
        border-radius: 4px;
        width: 100%;
        font-size: 13px;
        height: 36px;
        transition: border-color 0.2s;
      }
      input:focus, select:focus {
        outline: none;
        border-color: #0e639c;
      }
      input::placeholder {
        color: #777;
      }
      .row {
        display: flex;
        gap: 10px;
        align-items: center;
        margin-bottom: 10px;
      }
      .row:last-child {
        margin-bottom: 0;
      }
      .row > * {
        flex: 1;
      }
      .row > button {
        flex: 0 0 auto;
      }
      .results {
        margin-top: 24px;
        overflow-x: auto;
      }
      .results table {
        width: 100%;
        border-collapse: collapse;
        font-size: 12px;
        margin-top: 12px;
      }
      .results th, .results td {
        border: 1px solid #444;
        padding: 8px;
        text-align: left;
        max-width: 180px;
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
      }
      .results th {
        background: #333;
        font-weight: 600;
        color: #aaa;
      }
      .actions {
        display: flex;
        gap: 10px;
        margin-top: 12px;
      }
      .template-actions {
        display: flex;
        gap: 10px;
        margin-top: 24px;
        border-top: 1px solid #333;
        padding-top: 20px;
        padding-bottom: 4px;
      }
      #content {
        padding: 1rem;
      }
    `;
    shadowRoot.appendChild(style);

    const content = document.createElement('div');
    content.id = 'content';
    shadowRoot.appendChild(content);

    document.body.appendChild(uiContainer);

    // Setup global listeners
    document.addEventListener('mouseover', handleMouseOver, true);
    document.addEventListener('mouseout', handleMouseOut, true);
    document.addEventListener('click', handleClick, true);
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && isVisible) {
        toggleUI();
      }
    });
  }

  function getElementPath(el) {
    const path = [];
    let current = el;
    while (current && current !== document) {
      let selector = current.tagName.toLowerCase();
      if (current.id) {
        selector += '#' + CSS.escape(current.id);
      }
      if (current.className && typeof current.className === 'string') {
        const classes = current.className.trim().split(/\s+/).filter(c => c && !c.startsWith('wde-'));
        if (classes.length > 0) {
          selector += '.' + classes.map(c => CSS.escape(c)).join('.');
        }
      }
      path.unshift(selector);
      current = current.parentNode;
    }
    return path;
  }

  function handleMouseOver(e) {
    if (!selectingMode) return;
    if (uiContainer.contains(e.target)) return;
    if (hoveredElement) {
      hoveredElement.classList.remove('wde-highlight');
    }
    hoveredElement = e.target;
    hoveredElement.classList.add('wde-highlight');
  }

  function handleMouseOut(e) {
    if (!selectingMode) return;
    if (hoveredElement) {
      hoveredElement.classList.remove('wde-highlight');
      hoveredElement = null;
    }
  }

  function handleClick(e) {
    if (!selectingMode) return;
    if (uiContainer.contains(e.target)) return;

    e.preventDefault();
    e.stopPropagation();

    if (hoveredElement) {
      hoveredElement.classList.remove('wde-highlight');
    }

    const target = e.target;
    if (selectingMode === 'iteration') {
      iterationPath = getElementPath(target);
      iterationSelector = iterationPath.join(' ');
    } else {
      // It's a column selection
      const colId = selectingMode;
      const col = columns.find(c => c.id === colId);
      if (col) {
        // Try to get relative selector to closest iteration target
        if (iterationSelector) {
          const closestIter = target.closest(iterationSelector);
          if (closestIter) {
            col.selector = getRelativeSelector(closestIter, target) || ":scope";
          } else {
            col.selector = getRelativeSelector(document.body, target);
          }
        } else {
          col.selector = getRelativeSelector(document.body, target);
        }
      }
    }

    selectingMode = null;
    document.body.classList.remove('wde-selecting');
    uiContainer.style.display = "block"; // Restore UI
    render();

    // Return focus to Add Column button after any selection (iteration or column)
    setTimeout(() => {
      const addBtn = shadowRoot.querySelector('button[data-action="add-column"]');
      if (addBtn) addBtn.focus();
    }, 0);
  }

  function getRelativeSelector(parent, child) {
    if (parent === child) return "";
    let path = [];
    let current = child;
    while (current && current !== parent && current !== document) {
      let selector = current.tagName.toLowerCase();
      if (current.id) {
        selector += '#' + CSS.escape(current.id);
      }
      if (current.className && typeof current.className === 'string') {
        const classes = current.className.trim().split(/\s+/).filter(c => c && !c.startsWith('wde-'));
        if (classes.length > 0) {
          selector += '.' + classes.map(c => CSS.escape(c)).join('.');
        }
      }
      path.unshift(selector);
      current = current.parentNode;
    }
    return path.join(' > ');
  }
  function startSelecting(mode) {
    selectingMode = mode;
    uiContainer.style.display = "none";
    document.body.classList.add('wde-selecting');
  }
  function cancelSelection() {
    selectingMode = null;
    document.body.classList.remove('wde-selecting');
    if (hoveredElement) {
      hoveredElement.classList.remove('wde-highlight');
      hoveredElement = null;
    }
  }

  function render() {
    if (!shadowRoot) return;
    const content = shadowRoot.getElementById('content');
    content.innerHTML = '';

    const header = document.createElement('div');
    header.className = 'header';
    const title = document.createElement('h2');
    title.textContent = 'Web Data Extractor';
    const closeBtn = document.createElement('button');
    closeBtn.className = 'close-btn';
    closeBtn.innerHTML = '&times;';
    closeBtn.onclick = toggleUI;
    header.appendChild(title);
    header.appendChild(closeBtn);
    content.appendChild(header);

    // Iteration Target Section
    const iterSection = document.createElement('div');
    iterSection.className = 'section';
    iterSection.innerHTML = `<div class="section-title">Iteration Target</div>`;
    
    const row1 = document.createElement('div');
    row1.className = 'row';
    const iterInput = document.createElement('input');
    iterInput.value = iterationSelector;
    iterInput.placeholder = 'Iteration CSS Selector';
    iterInput.setAttribute('data-id', 'iter-input');
    iterInput.onchange = (e) => { 
      iterationSelector = e.target.value;
      iterationPath = []; 
      render();
    };
    const selectIterBtn = document.createElement('button');
    selectIterBtn.textContent = 'Select Target';
    selectIterBtn.onclick = () => startSelecting('iteration');
    row1.appendChild(iterInput);
    row1.appendChild(selectIterBtn);
    iterSection.appendChild(row1);

    if (iterationPath.length > 0) {
      const pathContainer = document.createElement('div');
      pathContainer.className = 'path-buttons';
      iterationPath.forEach((part, index) => {
        const btn = document.createElement('button');
        btn.className = 'path-btn';
        btn.textContent = '[' + part + ']';
        btn.title = iterationPath.slice(0, index + 1).join(' ');
        btn.onmouseover = () => {
          const selector = iterationPath.slice(0, index + 1).join(' ');
          try {
            document.querySelectorAll(selector).forEach(el => el.classList.add('wde-highlight-secondary'));
          } catch(e){}
        };
        btn.onmouseout = () => {
          const selector = iterationPath.slice(0, index + 1).join(' ');
          try {
            document.querySelectorAll(selector).forEach(el => el.classList.remove('wde-highlight-secondary'));
          } catch(e){}
        };
        btn.onclick = () => {
          iterationPath = iterationPath.slice(0, index + 1);
          iterationSelector = iterationPath.join(' ');
          render();
        };
        pathContainer.appendChild(btn);
      });
      iterSection.appendChild(pathContainer);
    }
    content.appendChild(iterSection);

    // Columns Section
    const colsSection = document.createElement('div');
    colsSection.className = 'section';
    const colsHeader = document.createElement('div');
    colsHeader.className = 'column-header';
    colsHeader.innerHTML = `<div class="section-title" style="margin-bottom:0">Columns</div>`;
    const addColBtn = document.createElement('button');
    addColBtn.textContent = '+ Add Column';
    addColBtn.setAttribute('data-action', 'add-column');
    addColBtn.onclick = () => {
      const id = Date.now().toString();
      columns.push({ id: id, name: 'Col ' + (columns.length + 1), selector: '', type: 'innerText', dataKey: '' });
      render();
      
      setTimeout(() => {
        const newColInput = shadowRoot.querySelector(`input[data-col-id="${id}"]`);
        if (newColInput) newColInput.focus();
      }, 0);
    };
    colsHeader.appendChild(addColBtn);
    colsSection.appendChild(colsHeader);

    columns.forEach((col, index) => {
      const colDiv = document.createElement('div');
      colDiv.className = 'column';
      
      const delBtn = document.createElement('button');
      delBtn.className = 'column-del-btn';
      delBtn.innerHTML = '&times;';
      delBtn.tabIndex = -1;
      delBtn.title = 'Remove Column';
      delBtn.onclick = () => {
        columns.splice(index, 1);
        render();
      };
      colDiv.appendChild(delBtn);

      const row1 = document.createElement('div');
      row1.className = 'row';
      const nameInput = document.createElement('input');
      nameInput.value = col.name;
      nameInput.placeholder = 'Column Name';
      nameInput.setAttribute('data-col-id', col.id);
      nameInput.onchange = (e) => { col.name = e.target.value; };
      nameInput.onfocus = (e) => { e.target.select(); };
      row1.appendChild(nameInput);
      colDiv.appendChild(row1);

      const row2 = document.createElement('div');
      row2.className = 'row';
      const pickBtn = document.createElement('button');
      pickBtn.textContent = 'Select';
      pickBtn.onclick = () => startSelecting(col.id);
      const selInput = document.createElement('input');
      selInput.value = col.selector;
      selInput.placeholder = 'CSS Selector';
      selInput.onchange = (e) => { col.selector = e.target.value; };
      
      row2.appendChild(pickBtn);
      row2.appendChild(selInput);
      colDiv.appendChild(row2);

      const row3 = document.createElement('div');
      row3.className = 'row';
      const typeSelect = document.createElement('select');
      ['innerText', 'innerHTML', 'href', 'data'].forEach(t => {
        const opt = document.createElement('option');
        opt.value = t;
        opt.textContent = t;
        if (col.type === t) opt.selected = true;
        typeSelect.appendChild(opt);
      });
      typeSelect.onchange = (e) => {
        col.type = e.target.value;
        render();
      };
      row3.appendChild(typeSelect);

      if (col.type === 'data') {
        const dataInput = document.createElement('input');
        dataInput.value = col.dataKey;
        dataInput.placeholder = 'data-???';
        dataInput.onchange = (e) => { col.dataKey = e.target.value; };
        row3.appendChild(dataInput);
      }
      colDiv.appendChild(row3);
      colsSection.appendChild(colDiv);
    });
    content.appendChild(colsSection);

    // Grab & Export
    if (iterationSelector && columns.length > 0) {
      const actionSection = document.createElement('div');
      actionSection.className = 'section';
      const grabBtn = document.createElement('button');
      grabBtn.className = 'primary';
      grabBtn.textContent = 'Grab Data';
      grabBtn.style.width = '100%';
      grabBtn.onclick = performGrab;
      actionSection.appendChild(grabBtn);
      content.appendChild(actionSection);
    }

    // Templates Section
    const templateSection = document.createElement('div');
    templateSection.className = 'template-actions';
    
    const saveBtn = document.createElement('button');
    saveBtn.textContent = 'Save Template';
    saveBtn.onclick = saveTemplate;
    
    const loadBtn = document.createElement('button');
    loadBtn.textContent = 'Load Template';
    loadBtn.onclick = loadTemplate;

    templateSection.appendChild(saveBtn);
    templateSection.appendChild(loadBtn);
    content.appendChild(templateSection);
  }

  function performGrab() {
    if (!iterationSelector) return;
    let elements;
    try {
      elements = document.querySelectorAll(iterationSelector);
    } catch(e) {
      alert('Invalid iteration selector');
      return;
    }

    const data = [];
    elements.forEach(el => {
      const rowData = {};
      columns.forEach(col => {
        let targetEl = el;
        if (col.selector && col.selector !== ":scope") {
          try {
            targetEl = el.querySelector(col.selector);
          } catch(e) {
            targetEl = null;
          }
        }
        let val = '';
        if (targetEl) {
          if (col.type === 'innerText') val = targetEl.innerText || '';
          else if (col.type === 'innerHTML') val = targetEl.innerHTML || '';
          else if (col.type === 'href') val = targetEl.href || targetEl.getAttribute('href') || '';
          else if (col.type === 'data') val = targetEl.getAttribute(col.dataKey || '') || '';
        }
        rowData[col.name] = val.trim();
      });
      data.push(rowData);
    });
    showResults(data);
  }

  function showResults(data) {
    const content = shadowRoot.getElementById('content');
    let resSection = shadowRoot.getElementById('results-section');
    if (!resSection) {
      resSection = document.createElement('div');
      resSection.id = 'results-section';
      resSection.className = 'section results';
      content.appendChild(resSection);
    }
    
    resSection.innerHTML = `<div><strong>Extracted ${data.length} rows</strong></div>`;
    
    if (data.length > 0) {
      const table = document.createElement('table');
      const thead = document.createElement('thead');
      const headerRow = document.createElement('tr');
      Object.keys(data[0]).forEach(key => {
        const th = document.createElement('th');
        th.textContent = key;
        headerRow.appendChild(th);
      });
      thead.appendChild(headerRow);
      table.appendChild(thead);

      const tbody = document.createElement('tbody');
      data.slice(0, 5).forEach(row => {
        const tr = document.createElement('tr');
        Object.values(row).forEach(val => {
          const td = document.createElement('td');
          td.textContent = val;
          tr.appendChild(td);
        });
        tbody.appendChild(tr);
      });
      table.appendChild(tbody);
      resSection.appendChild(table);
      
      if (data.length > 5) {
        const more = document.createElement('div');
        more.style.fontSize = '10px';
        more.style.color = '#888';
        more.style.marginTop = '4px';
        more.textContent = `... and ${data.length - 5} more rows.`;
        resSection.appendChild(more);
      }
    }

    const actions = document.createElement('div');
    actions.className = 'actions';
    const csvBtn = document.createElement('button');
    csvBtn.textContent = 'Download CSV';
    csvBtn.onclick = () => downloadCSV(data);
    const jsonBtn = document.createElement('button');
    jsonBtn.textContent = 'Download JSON';
    jsonBtn.onclick = () => downloadJSON(data);
    actions.appendChild(csvBtn);
    actions.appendChild(jsonBtn);
    resSection.appendChild(actions);
  }

  async function saveTemplate() {
    const name = prompt('Template Name:', window.location.hostname);
    if (!name) return;
    
    const template = {
      iterationSelector,
      columns
    };

    if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
      const data = await chrome.storage.local.get('wde_templates') || {};
      const templates = data.wde_templates || {};
      templates[name] = template;
      await chrome.storage.local.set({ wde_templates: templates });
      alert('Template saved!');
    } else {
      alert('Storage API not available');
    }
  }

  async function loadTemplate() {
    if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
      const data = await chrome.storage.local.get('wde_templates');
      const templates = data.wde_templates || {};
      const names = Object.keys(templates);
      if (names.length === 0) {
        alert('No templates saved');
        return;
      }
      const name = prompt('Select Template:\n' + names.join('\n'));
      if (name && templates[name]) {
        const template = templates[name];
        iterationSelector = template.iterationSelector;
        columns = template.columns;
        iterationPath = []; // Reset path as it's a template
        render();
      }
    } else {
      alert('Storage API not available');
    }
  }
  function getExportFileName(ext) {
    const now = new Date();
    const timestamp = now.getFullYear() + '-' + 
                      String(now.getMonth() + 1).padStart(2, '0') + '-' + 
                      String(now.getDate()).padStart(2, '0') + '_' + 
                      String(now.getHours()).padStart(2, '0') + '-' + 
                      String(now.getMinutes()).padStart(2, '0') + '-' + 
                      String(now.getSeconds()).padStart(2, '0');

    let title = document.title || 'extracted_data';
    // Clean title for filename
    title = title.replace(/[^a-z0-9]/gi, '_').replace(/_{2,}/g, '_').toLowerCase().substring(0, 50);

    return `${timestamp}-${title}.${ext}`;
  }

  function downloadJSON(data) {
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = getExportFileName('json');
    a.click();
    URL.revokeObjectURL(url);
  }

  function downloadCSV(data) {
    if (data.length === 0) return;
    const headers = Object.keys(data[0]);
    const rows = data.map(row => {
      return headers.map(h => {
        let val = row[h] || '';
        if (typeof val !== 'string') val = String(val);
        val = val.replace(/"/g, '""');
        return `"${val}"`;
      }).join(',');
    });
    const csvContent = [headers.join(','), ...rows].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = getExportFileName('csv');
    a.click();
    URL.revokeObjectURL(url);
  }

})();