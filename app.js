/* global window, document */

const MAX_FILE_SIZE = 25 * 1024 * 1024;
const acceptedTypes = new Set(["image/jpeg", "image/png", "image/webp"]);
const files = [];

const input = document.querySelector("#file-input");
const dropZone = document.querySelector("#drop-zone");
const fileArea = document.querySelector("#file-area");
const fileList = document.querySelector("#file-list");
const fileCount = document.querySelector("#file-count");
const clearButton = document.querySelector("#clear-button");
const settings = document.querySelector("#settings");
const exportCard = document.querySelector("#export-card");
const createButton = document.querySelector("#create-button");
const exportSummary = document.querySelector("#export-summary");
const toast = document.querySelector("#toast");

let draggedId = null;
let toastTimer;

function showToast(message) {
  window.clearTimeout(toastTimer);
  toast.textContent = message;
  toast.classList.add("show");
  toastTimer = window.setTimeout(() => toast.classList.remove("show"), 3300);
}

function makeId() {
  return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function addFiles(newFiles) {
  const rejected = [];
  Array.from(newFiles).forEach((file) => {
    if (!acceptedTypes.has(file.type)) {
      rejected.push(`${file.name}: неподдерживаемый формат`);
      return;
    }
    if (file.size > MAX_FILE_SIZE) {
      rejected.push(`${file.name}: больше 25 МБ`);
      return;
    }
    files.push({ id: makeId(), file, url: URL.createObjectURL(file) });
  });

  render();
  if (rejected.length) showToast(rejected.length === 1 ? rejected[0] : `Не добавлено файлов: ${rejected.length}`);
}

function removeFile(id) {
  const index = files.findIndex((item) => item.id === id);
  if (index < 0) return;
  URL.revokeObjectURL(files[index].url);
  files.splice(index, 1);
  render();
}

function clearFiles() {
  files.forEach((item) => URL.revokeObjectURL(item.url));
  files.length = 0;
  input.value = "";
  render();
}

function render() {
  const hasFiles = files.length > 0;
  fileArea.hidden = !hasFiles;
  settings.hidden = !hasFiles;
  exportCard.hidden = !hasFiles;
  clearButton.hidden = !hasFiles;
  fileCount.textContent = `${files.length} ${pluralize(files.length, "изображение", "изображения", "изображений")}`;
  exportSummary.textContent = `${files.length} ${pluralize(files.length, "изображение", "изображения", "изображений")} — ${files.length} ${pluralize(files.length, "страница", "страницы", "страниц")} PDF.`;
  fileList.replaceChildren(...files.map((item, index) => createFileCard(item, index)));
}

function pluralize(number, one, few, many) {
  const mod10 = number % 10;
  const mod100 = number % 100;
  if (mod10 === 1 && mod100 !== 11) return one;
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14)) return few;
  return many;
}

function createFileCard(item, index) {
  const card = document.createElement("li");
  card.className = "file-item";
  card.draggable = true;
  card.dataset.id = item.id;
  card.innerHTML = `
    <img class="thumb" src="${item.url}" alt="Предпросмотр: ${escapeHtml(item.file.name)}" />
    <button class="remove-file" type="button" aria-label="Удалить ${escapeHtml(item.file.name)}">×</button>
    <span class="file-info"><span class="file-number">СТРАНИЦА ${index + 1}</span><span class="file-name">${escapeHtml(item.file.name)}</span></span>`;
  card.querySelector(".remove-file").addEventListener("click", () => removeFile(item.id));
  card.addEventListener("dragstart", () => {
    draggedId = item.id;
    card.classList.add("dragging");
  });
  card.addEventListener("dragend", () => {
    draggedId = null;
    card.classList.remove("dragging");
  });
  card.addEventListener("dragover", (event) => event.preventDefault());
  card.addEventListener("drop", (event) => {
    event.preventDefault();
    moveFile(draggedId, item.id);
  });
  return card;
}

function escapeHtml(value) {
  const element = document.createElement("span");
  element.textContent = value;
  return element.innerHTML;
}

function moveFile(sourceId, targetId) {
  if (!sourceId || sourceId === targetId) return;
  const sourceIndex = files.findIndex((item) => item.id === sourceId);
  const targetIndex = files.findIndex((item) => item.id === targetId);
  if (sourceIndex < 0 || targetIndex < 0) return;
  const [moved] = files.splice(sourceIndex, 1);
  files.splice(targetIndex, 0, moved);
  render();
}

async function imageDimensions(file) {
  const url = URL.createObjectURL(file);
  try {
    const image = new Image();
    image.src = url;
    await image.decode();
    return { width: image.naturalWidth, height: image.naturalHeight };
  } finally {
    URL.revokeObjectURL(url);
  }
}

async function createPdf() {
  if (!files.length || !window.jspdf) {
    showToast("Не удалось загрузить модуль создания PDF. Проверьте интернет-соединение.");
    return;
  }

  createButton.disabled = true;
  createButton.innerHTML = "Создаём PDF…";
  try {
    const { jsPDF } = window.jspdf;
    const format = document.querySelector("#page-format").value;
    const selectedOrientation = document.querySelector("#orientation").value;
    const margin = Number(document.querySelector("#margin").value);
    let pdf;

    for (let index = 0; index < files.length; index += 1) {
      const item = files[index];
      const { width, height } = await imageDimensions(item.file);
      const orientation = selectedOrientation === "auto" ? (width > height ? "landscape" : "portrait") : selectedOrientation;
      const pageFormat = format === "original" ? [width * 0.264583, height * 0.264583] : format;

      if (!pdf) {
        pdf = new jsPDF({ orientation, unit: "mm", format: pageFormat, compress: true });
      } else {
        pdf.addPage(pageFormat, orientation);
      }

      const pageWidth = pdf.internal.pageSize.getWidth();
      const pageHeight = pdf.internal.pageSize.getHeight();
      const ratio = Math.min((pageWidth - margin * 2) / width, (pageHeight - margin * 2) / height);
      const drawWidth = width * ratio;
      const drawHeight = height * ratio;
      const x = (pageWidth - drawWidth) / 2;
      const y = (pageHeight - drawHeight) / 2;
      const dataUrl = await readAsDataUrl(item.file);
      const imageFormat = item.file.type === "image/png" ? "PNG" : "JPEG";
      pdf.addImage(dataUrl, imageFormat, x, y, drawWidth, drawHeight, undefined, "FAST");
      createButton.innerHTML = `Создаём PDF… ${index + 1}/${files.length}`;
    }
    pdf.save("images-to-pdf.pdf");
    showToast("PDF готов — загрузка началась.");
  } catch (error) {
    console.error(error);
    showToast("Не получилось собрать PDF. Попробуйте файлы меньшего размера.");
  } finally {
    createButton.disabled = false;
    createButton.innerHTML = '<span aria-hidden="true">↓</span> Скачать PDF';
  }
}

function readAsDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });
}

input.addEventListener("change", (event) => addFiles(event.target.files));
document.querySelector("#add-more").addEventListener("click", () => input.click());
clearButton.addEventListener("click", clearFiles);
createButton.addEventListener("click", createPdf);

["dragenter", "dragover"].forEach((eventName) => dropZone.addEventListener(eventName, (event) => {
  event.preventDefault();
  dropZone.classList.add("is-dragging");
}));
["dragleave", "drop"].forEach((eventName) => dropZone.addEventListener(eventName, (event) => {
  event.preventDefault();
  dropZone.classList.remove("is-dragging");
}));
dropZone.addEventListener("drop", (event) => addFiles(event.dataTransfer.files));
