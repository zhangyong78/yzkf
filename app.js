const state = { color: '#e60012', ringBreaks: createRingBreaks() };
const $ = (id) => document.getElementById(id);

function values() {
  return {
    topText: $('topText').value.trim() || '某某某某某游戏工作室',
    bottomText: $('bottomText').value.trim() || '某某某某某',
    sizeMm: Math.max(10, Number($('sizeMm').value) || 40),
    lineWidth: Math.max(1, Number($('lineWidth').value) || 4),
    fontFamily: $('fontFamily').value,
    color: state.color,
    ringBreaks: state.ringBreaks,
  };
}

function createRingBreaks() {
  // Keep one pattern until explicitly regenerated, so preview and exports agree.
  return Array.from({ length: 18 }, (_, index) => ({
    angle: (index + 0.18 + Math.random() * 0.64) * Math.PI * 2 / 18,
    width: 0.55 + Math.random() * 0.75,
    skew: (Math.random() - 0.5) * 2,
    through: index % 3 === 0,
    depth: 0.2 + Math.random() * 0.35,
    side: Math.random() < 0.5 ? -1 : 1,
  }));
}

function ringBreakPolygons(data) {
  const halfStroke = (data.lineWidth + 0.7) / 2;
  return data.ringBreaks.map((gap) => {
    const start = gap.through ? -halfStroke - 1 : gap.side * (halfStroke + 1);
    const end = gap.through ? halfStroke + 1 : gap.side * (halfStroke - gap.depth * halfStroke * 2);
    const levels = [0, 0.3, 0.65, 1];
    const offsets = [0, gap.skew * 0.3 + 0.3, gap.skew * 0.65 - 0.25, gap.skew];
    const widths = [0.9, 0.7, 1.1, gap.through ? 0.8 : 0.12];
    const edge = (index, side) => {
      const radius = 124 + start + (end - start) * levels[index];
      const tangent = offsets[index] + side * gap.width * widths[index] / 2;
      return [
        Number((140 + Math.cos(gap.angle) * radius - Math.sin(gap.angle) * tangent).toFixed(3)),
        Number((140 + Math.sin(gap.angle) * radius + Math.cos(gap.angle) * tangent).toFixed(3)),
      ];
    };
    return [0, 1, 2, 3].map((index) => edge(index, -1))
      .concat([3, 2, 1, 0].map((index) => edge(index, 1)));
  });
}

function escapeXml(text) {
  return String(text).replace(/[&<>"']/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&apos;' }[char]));
}

function starPoints(cx, cy, outer, inner, count = 5) {
  const points = [];
  for (let i = 0; i < count * 2; i += 1) {
    const radius = i % 2 === 0 ? outer : inner;
    const angle = -Math.PI / 2 + (Math.PI * i) / count;
    points.push(`${(cx + Math.cos(angle) * radius).toFixed(2)},${(cy + Math.sin(angle) * radius).toFixed(2)}`);
  }
  return points.join(' ');
}

function topFontSizeFor(text) {
  return Math.max(24, Math.min(42, 365 / Math.max(text.length, 5)));
}

function bottomFontSizeFor(text) {
  return Math.max(16, Math.min(32, 170 / Math.max(text.length, 5)));
}

function normalizeTextRotation(angle) {
  return angle + 90;
}

function buildArcText(text, options) {
  const chars = Array.from(text);
  if (!chars.length) return '';
  return chars.map((char, index) => {
    const progress = chars.length === 1 ? 0.5 : index / (chars.length - 1);
    const angle = options.startAngle + (options.endAngle - options.startAngle) * progress;
    const radians = angle * Math.PI / 180;
    const x = options.cx + Math.cos(radians) * options.radius;
    const y = options.cy + Math.sin(radians) * options.radius;
    const rotation = normalizeTextRotation(angle);
    const scaleX = options.scaleX ?? 1;
    const scaleY = options.scaleY ?? 1;
    return `<text x="${x.toFixed(2)}" y="${y.toFixed(2)}" fill="${options.color}" font-family="${escapeXml(options.fontFamily)}" font-size="${options.fontSize.toFixed(2)}" font-weight="700" text-anchor="middle" dominant-baseline="middle" transform="translate(${x.toFixed(2)} ${y.toFixed(2)}) rotate(${rotation.toFixed(2)}) scale(${scaleX} ${scaleY}) translate(${-x.toFixed(2)} ${-y.toFixed(2)})">${escapeXml(char)}</text>`;
  }).join('');
}

function topArcLayout(text) {
  return {
    chars: Array.from(text),
    startAngle: -192.5,
    endAngle: 12.5,
    radius: 88,
    cx: 140,
    cy: 140,
  };
}

function getArcCharacter(layout, index) {
  const progress = layout.chars.length === 1 ? 0.5 : index / (layout.chars.length - 1);
  const angle = layout.startAngle + (layout.endAngle - layout.startAngle) * progress;
  const radians = angle * Math.PI / 180;
  return {
    angle,
    rotation: normalizeTextRotation(angle),
    x: layout.cx + Math.cos(radians) * layout.radius,
    y: layout.cy + Math.sin(radians) * layout.radius,
  }
}

function buildSvg(data, includeText = true) {
  const topSize = topFontSizeFor(data.topText);
  const bottomSize = bottomFontSizeFor(data.bottomText);
  const stroke = data.lineWidth;
  const ringCuts = ringBreakPolygons(data).map((polygon) =>
    `<polygon points="${polygon.map((point) => point.join(',')).join(' ')}" fill="black"/>`
  ).join('');
  const bottomLength = Math.min(165, Math.max(110, data.bottomText.length * 28));
  const top = includeText ? buildArcText(data.topText, {
    ...topArcLayout(data.topText),
    color: data.color,
    fontFamily: data.fontFamily,
    fontSize: topSize,
    scaleX: 0.80,
    scaleY: 1.12,
  }) : '';
  return `<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" width="${data.sizeMm}mm" height="${data.sizeMm}mm" viewBox="0 0 280 280">
  <defs>
    <mask id="ring-breaks" maskUnits="userSpaceOnUse" maskContentUnits="userSpaceOnUse" x="0" y="0" width="280" height="280" style="mask-type:luminance">
      <rect width="280" height="280" fill="white"/>
      ${ringCuts}
    </mask>
  </defs>
  <g fill="none" stroke="${data.color}" stroke-width="${stroke + 0.7}" stroke-linejoin="round">
    <circle cx="140" cy="140" r="124" mask="url(#ring-breaks)"/>
  </g>
  <g fill="${data.color}">
    <polygon points="${starPoints(140, 139, 32, 13.5)}"/>
    ${top}
    ${includeText ? `<text x="140" y="222" text-anchor="middle" font-family="${escapeXml(data.fontFamily)}" font-size="${bottomSize}" font-weight="700" letter-spacing="1" textLength="${bottomLength}" lengthAdjust="spacingAndGlyphs" transform="translate(140 222) scale(0.86 1.12) translate(-140 -222)">${escapeXml(data.bottomText)}</text>` : ''}
  </g>
</svg>`;
}

function updatePreview() {
  const data = values();
  $('sealPreview').innerHTML = buildSvg(data).replace(/^<svg[^>]*>|<\/svg>$/g, '');
  $('previewTitle').textContent = data.bottomText;
  $('sizeLabel').textContent = `${data.sizeMm} × ${data.sizeMm} mm`;
}

function download(filename, content, type = 'text/plain;charset=utf-8') {
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

function downloadSvg() {
  const data = values();
  download('印章-机器矢量版.svg', buildSvg(data), 'image/svg+xml;charset=utf-8');
}

function downloadPng() {
  const data = values();
  const svg = buildSvg(data);
  const blob = new Blob([svg], { type: 'image/svg+xml;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const image = new Image();
  image.onload = () => {
    const canvas = document.createElement('canvas');
    canvas.width = 1200;
    canvas.height = 1200;
    const context = canvas.getContext('2d');
    context.clearRect(0, 0, canvas.width, canvas.height);
    context.drawImage(image, 0, 0, 1200, 1200);
    canvas.toBlob((png) => {
      const pngUrl = URL.createObjectURL(png);
      const link = document.createElement('a');
      link.href = pngUrl;
      link.download = '印章-透明背景.png';
      link.click();
      URL.revokeObjectURL(pngUrl);
      URL.revokeObjectURL(url);
    }, 'image/png');
  };
  image.src = url;
}

function jsxString(text) {
  return JSON.stringify(String(text)).replace(/\\u2028|\\u2029/g, '');
}

function buildJsx(data) {
  const ringCuts = ringBreakPolygons(data).map((polygon) =>
    polygon.map((point) => point.map((coordinate) => Number((coordinate * 3.2).toFixed(3))))
  );
  const topLayout = topArcLayout(data.topText);
  const topSize = topFontSizeFor(data.topText);
  const bottomSize = bottomFontSizeFor(data.bottomText);
  const photoshopFont = data.fontFamily.split(',')[0].trim();
  const chars = topLayout.chars.map((char, index) => {
    const position = getArcCharacter(topLayout, index);
    const baselineY = position.y + topSize * 0.35;
    return `addTextLayer(doc, ${jsxString(char)}, ${position.x.toFixed(2)}, ${baselineY.toFixed(2)}, ${topSize.toFixed(2)}, ${jsxString(photoshopFont)}, ${jsxString(`上弧-${index + 1}`)}, ${position.rotation.toFixed(2)}, 80, 112);`;
  }).join('\n');
  const star = starPoints(140, 139, 32, 13.5).split(' ').map((point) => {
    const [x, y] = point.split(',');
    return `[${(Number(x) * 3.2).toFixed(2)}, ${(Number(y) * 3.2).toFixed(2)}]`;
  }).join(', ');
  return `/*
  圆形印章生成器导出的 Photoshop JSX
  运行方式：Photoshop -> 文件 -> 脚本 -> 浏览，选择本文件。
  上弧文字会生成独立的可编辑文字图层，便于后续改字。
*/
#target photoshop
app.displayDialogs = DialogModes.NO;

(function () {
  var W = 896;
  var H = 896;
  var doc = app.documents.add(W, H, 300, ${jsxString('圆形印章')}, NewDocumentMode.RGB, DocumentFill.TRANSPARENT);
  var red = new SolidColor();
  red.rgb.red = ${parseInt(data.color.slice(1, 3), 16)};
  red.rgb.green = ${parseInt(data.color.slice(3, 5), 16)};
  red.rgb.blue = ${parseInt(data.color.slice(5, 7), 16)};

  function addTextLayer(document, content, x, y, size, font, name, rotation, horizontalScale, verticalScale) {
    var layer = document.artLayers.add();
    layer.kind = LayerKind.TEXT;
    layer.name = name;
    layer.textItem.contents = content;
    layer.textItem.font = font;
    layer.textItem.size = new UnitValue(size * 3.2, 'px');
    layer.textItem.color = red;
    layer.textItem.justification = Justification.CENTER;
    layer.textItem.position = [new UnitValue(x * 3.2, 'px'), new UnitValue(y * 3.2, 'px')];
    if (rotation) layer.rotate(rotation, AnchorPosition.MIDDLECENTER);
    if (horizontalScale || verticalScale) layer.resize(horizontalScale || 100, verticalScale || 100, AnchorPosition.MIDDLECENTER);
    return layer;
  }

  function addCircle(document, diameter, name) {
    var layer = document.artLayers.add();
    layer.name = name;
    var left = (140 - diameter / 2) * 3.2;
    var top = (140 - diameter / 2) * 3.2;
    var right = (140 + diameter / 2) * 3.2;
    var bottom = (140 + diameter / 2) * 3.2;
    document.selection.selectEllipse([left, top, right, bottom]);
    document.selection.stroke(red, ${data.lineWidth * 3.2}, StrokeLocation.INSIDE, ColorBlendMode.NORMAL, 100, false);
    document.selection.deselect();
  }

  addCircle(doc, 248, '外圆边框');
  var ringCuts = ${JSON.stringify(ringCuts)};
  for (var cutIndex = 0; cutIndex < ringCuts.length; cutIndex++) {
    doc.selection.select(ringCuts[cutIndex]);
    doc.selection.clear();
  }
  doc.selection.deselect();
  var starLayer = doc.artLayers.add();
  starLayer.name = '中心五角星';
  doc.selection.select([${star}]);
  doc.selection.fill(red);
  doc.selection.deselect();
  ${chars}
  addTextLayer(doc, ${jsxString(data.bottomText)}, 140, 222, ${bottomSize.toFixed(2)}, ${jsxString(photoshopFont)}, '下方文字', 0, 86, 112);
  alert('印章已生成。文字图层可以在 Photoshop 中双击修改。');
})();
`;
}

function downloadJsx() {
  const data = values();
  download('印章-Photoshop分层.jsx', buildJsx(data), 'text/plain;charset=utf-8');
}

document.querySelectorAll('input, select').forEach((element) => element.addEventListener('input', updatePreview));
document.querySelectorAll('.color-option').forEach((button) => button.addEventListener('click', () => {
  document.querySelectorAll('.color-option').forEach((item) => item.classList.remove('active'));
  button.classList.add('active');
  state.color = button.dataset.color;
  updatePreview();
}));
$('exportSvg').addEventListener('click', downloadSvg);
$('exportPng').addEventListener('click', downloadPng);
$('exportJsx').addEventListener('click', downloadJsx);
$('regenerateBreaks').addEventListener('click', () => {
  state.ringBreaks = createRingBreaks();
  updatePreview();
});
updatePreview();
