# Web Data Extractor

A Firefox web extension to easily extract tabular data from websites with a point-and-click interface.

## Features

- **Visual Element Selection:** Pick iteration targets and column values directly from the page visually.
- **Selector Path Navigation:** Hover over elements of the selected path to find the right wrapping element visually.
- **Relative Path Calculation:** Automatically calculates paths for column selections relative to the iteration target.
- **Multiple Data Types:** Extract innerText, innerHTML, href, or custom data attributes.
- **Export Data:** Download extracted data as JSON or CSV.
- **Unobtrusive UI:** Minimal dark theme UI with shadow DOM encapsulation.

## How to Install locally on Firefox

1. Open Firefox and navigate to `about:debugging#/runtime/this-firefox`.
2. Click on **Load Temporary Add-on...**
3. Select the `manifest.json` file in this directory.

## Usage

1. Open a website with tabular or repetitive data (e.g., a product listing).
2. Click the Web Data Extractor extension icon in the toolbar. The UI will appear.
3. Click **Select Target**. The UI will hide.
4. Hover over an element you want to iterate over (e.g., a product card). It will highlight.
5. Click the element. The UI will return and show a path of selectors from the body to your clicked element.
6. Hover over the path buttons (e.g., `[body]`, `[#main]`, `[.product-card]`) to see which elements they represent on the page. Click the one that correctly represents the iteration target.
7. Click **+ Add Column** to define what data to extract for each iterated element.
8. Set a column name, then click **Select** next to the CSS Selector field.
9. Click the child element inside an iteration target that you want to extract. The extension will automatically calculate the relative CSS selector.
10. Choose the value type to extract (`innerText`, `innerHTML`, `href`, or `data` with an attribute name).
11. Repeat steps 7-10 for any other data you want to extract.
12. Click **Grab Data**. The data will be extracted and you can download it as CSV or JSON.
