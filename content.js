(function() {
  if (window.__wde_injected) return;
  window.__wde_injected = true;

  let uiContainer = null;
  let shadowRoot = null;
  let isVisible = false;
  let selectingMode = null; // 'iteration', or column id
  let iterationPath = [];
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
    uiContainer.style.width = "350px";
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
        border-radius: 8px;
        box-shadow: 0 10px 25px rgba(0,0,0,0.5);
        padding: 16px;
        box-sizing: border-box;
      }
      * {
        box-sizing: border-box;
      }
      h2 {
        margin-top: 0;
        font-size: 18px;
        border-bottom: 1px solid #333;
        padding-bottom: 8px;
        margin-bottom: 12px;
      }
      button {
        background: #3a3a3a;
        color: #fff;
        border: 1px solid #555;
        border-radius: 4px;
        padding: 6px 12px;
        cursor: pointer;
        font-size: 14px;
        transition: background 0.2s;
      }
      button:hover {
        background: #4a4a4a;
      }
      button.primary {
        background: #0e639c;
        border-color: #1177bb;
      }
      button.primary:hover {
        background: #1177bb;
      }
      .section {
        margin-bottom: 16px;
        background: #252526;
        padding: 12px;
        border-radius: 6px;
        border: 1px solid #333;
      }
      .path-buttons {
        display: flex;
        flex-wrap: wrap;
        gap: 4px;
        margin-top: 8px;
      }
      .path-btn {
        background: #333;
        border: 1px solid #555;
        color: #ccc;
        padding: 2px 6px;
        border-radius: 3px;
        font-size: 12px;
        cursor: pointer;
      }
      .path-btn:hover {
        background: #555;
        color: #fff;
      }
      .column {
        background: #2d2d2d;
        border: 1px solid #444;
        padding: 8px;
        border-radius: 4px;
        margin-bottom: 8px;
      }
      .column-header {
        display: flex;
        justify-content: space-between;
        margin-bottom: 8px;
      }
      input, select {
        background: #3c3c3c;
        color: #fff;
        border: 1px solid #555;
        padding: 4px 8px;
        border-radius: 3px;
        width: 100%;
        margin-bottom: 8px;
        font-size: 13px;
      }
      input:focus, select:focus {
        outline: none;
        border-color: #0e639c;
      }
      .row {
        display: flex;
        gap: 8px;
        align-items: center;
      }
      .row > * {
        flex: 1;
      }
      .row > button {
        flex: 0 0 auto;
      }
      .results {
        margin-top: 16px;
      }
      .actions {
        display: flex;
        gap: 8px;
        margin-top: 8px;
      }
    `;
    shadowRoot.appendChild(style);

    const content = document.createElement('div');
    content.id = 'content';
    shadowRoot.appendChild(content);

    document.body.appendChild(uiContainer);

    // Setup global listeners for selection
    document.addEventListener('mouseover', handleMouseOver, true);
    document.addEventListener('mouseout', handleMouseOut, true);
    document.addEventListener('click', handleClick, true);
  }

  function getElementPath(el) {
    const path = [];
    let current = el;
    while (current && current !== document) {
      let selector = current.tagName.toLowerCase();
      if (current.id) {
        selector = '#' + current.id;
      } else if (current.className && typeof current.className === 'string') {
        const classes = current.className.trim().split(/\\s+/).filter(c => c && !c.startsWith('wde-'));
        if (classes.length > 0) {
          selector += '.' + classes.join('.');
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
    } else {
      // It's a column selection
      const colId = selectingMode;
      const col = columns.find(c => c.id === colId);
      if (col) {
        // Try to get relative selector to closest iteration target
        const iterSelector = getIterationSelector();
        if (iterSelector) {
          const closestIter = target.closest(iterSelector);
          if (closestIter) {
            col.selector = getRelativeSelector(closestIter, target) || ":scope";
          } else {
            // Fallback
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
  }

  function getRelativeSelector(parent, child) {
    if (parent === child) return "";
    let path = [];
    let current = child;
    while (current && current !== parent && current !== document) {
      let selector = current.tagName.toLowerCase();
      if (current.className && typeof current.className === 'string') {
        const classes = current.className.trim().split(/\\s+/).filter(c => c && !c.startsWith('wde-'));
        if (classes.length > 0) {
          selector += '.' + classes[0]; // just use first class for simplicity
        }
      }

      // Add nth-child if needed to be more specific, but for template extraction
      // we usually just want the class structure.
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

  function getIterationSelector() {
    if (iterationPath.length === 0) return "";
    return iterationPath.join(' ');
  }

  function render() {
    if (!shadowRoot) return;
    const content = shadowRoot.getElementById('content');
    content.innerHTML = '';

    const title = document.createElement('h2');
    title.textContent = 'Web Data Extractor';
    content.appendChild(title);

    // Iteration Target Section
    const iterSection = document.createElement('div');
    iterSection.className = 'section';
    iterSection.innerHTML = `<div><strong>Iteration Target</strong></div>`;

    const selectIterBtn = document.createElement('button');
    selectIterBtn.textContent = iterationPath.length ? 'Reselect Target' : 'Select Target';
    selectIterBtn.onclick = () => startSelecting('iteration');
    iterSection.appendChild(selectIterBtn);

    if (iterationPath.length > 0) {
      const pathContainer = document.createElement('div');
      pathContainer.className = 'path-buttons';

      iterationPath.forEach((part, index) => {
        const btn = document.createElement('button');
        btn.className = 'path-btn';
        btn.textContent = '[' + part + ']';

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
          render();
        };

        pathContainer.appendChild(btn);
      });
      iterSection.appendChild(pathContainer);

      const finalSelectorDiv = document.createElement('div');
      finalSelectorDiv.style.marginTop = '8px';
      finalSelectorDiv.style.fontSize = '12px';
      finalSelectorDiv.style.color = '#aaa';
      finalSelectorDiv.style.wordBreak = 'break-all';
      finalSelectorDiv.textContent = 'Selector: ' + getIterationSelector();
      iterSection.appendChild(finalSelectorDiv);
    }
    content.appendChild(iterSection);

    // Columns Section
    const colsSection = document.createElement('div');
    colsSection.className = 'section';

    const colsHeader = document.createElement('div');
    colsHeader.className = 'column-header';
    colsHeader.innerHTML = `<strong>Columns</strong>`;

    const addColBtn = document.createElement('button');
    addColBtn.textContent = '+ Add Column';
    addColBtn.onclick = () => {
      columns.push({ id: Date.now().toString(), name: 'Col ' + (columns.length + 1), selector: '', type: 'innerText', dataKey: '' });
      render();
    };
    colsHeader.appendChild(addColBtn);
    colsSection.appendChild(colsHeader);

    columns.forEach((col, index) => {
      const colDiv = document.createElement('div');
      colDiv.className = 'column';

      const row1 = document.createElement('div');
      row1.className = 'row';
      const nameInput = document.createElement('input');
      nameInput.value = col.name;
      nameInput.placeholder = 'Column Name';
      nameInput.onchange = (e) => { col.name = e.target.value; };

      const delBtn = document.createElement('button');
      delBtn.textContent = '✕';
      delBtn.style.padding = '4px 8px';
      delBtn.onclick = () => {
        columns.splice(index, 1);
        render();
      };

      row1.appendChild(nameInput);
      row1.appendChild(delBtn);
      colDiv.appendChild(row1);

      const row2 = document.createElement('div');
      row2.className = 'row';

      const selInput = document.createElement('input');
      selInput.value = col.selector;
      selInput.placeholder = 'CSS Selector';
      selInput.onchange = (e) => { col.selector = e.target.value; };

      const pickBtn = document.createElement('button');
      pickBtn.textContent = 'Select';
      pickBtn.onclick = () => startSelecting(col.id);

      row2.appendChild(selInput);
      row2.appendChild(pickBtn);
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
    if (iterationPath.length > 0 && columns.length > 0) {
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
  }

  function performGrab() {
    const iterSel = getIterationSelector();
    if (!iterSel) return;

    let elements;
    try {
      elements = document.querySelectorAll(iterSel);
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

  function downloadJSON(data) {
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'extracted_data.json';
    a.click();
    URL.revokeObjectURL(url);
  }

  function downloadCSV(data) {
    if (data.length === 0) return;
    const headers = Object.keys(data[0]);
    const rows = data.map(row => {
      return headers.map(h => {
        let val = row[h] || '';
        val = val.replace(/"/g, '""');
        return `"${val}"`;
      }).join(',');
    });

    const csvContent = [headers.join(','), ...rows].join('\\n');
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'extracted_data.csv';
    a.click();
    URL.revokeObjectURL(url);
  }

})();