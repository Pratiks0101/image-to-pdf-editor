from fastapi import FastAPI, UploadFile, File, HTTPException
from fastapi.middleware.cors import CORSMiddleware
import pytesseract
from PIL import Image, ImageDraw, ImageFont
from io import BytesIO
import cv2
import numpy as np
import re


def detect_font_from_image(word_img_array, font_size=30):
    """Detect the closest matching system font for a word image."""
    try:
        import os
        import subprocess
        from PIL import Image, ImageDraw, ImageFont
        from reportlab.pdfbase import pdfmetrics
        from reportlab.pdfbase.ttfonts import TTFont
        word_img = Image.fromarray(cv2.cvtColor(word_img_array, cv2.COLOR_GRAY2RGB))
        word_width, word_height = word_img.size
        
        # Get system fonts registered with reportlab
        font_names = pdfmetrics.get_font_names()
        
        if not font_names:
            return 'serif'
        
        best_font = 'serif'
        best_score = 0
        
        for font_name in font_names:
            try:
                # Get font file path
                font_paths = pdfmetrics.get_font_path(font_name)
                if not font_paths:
                    continue
                
                font_path = font_paths[0]
                
                # Try to measure text with this font
                font = TTFont(font_path)
                
                # Calculate text dimensions
                test_text = word_img.tobytes()[:50] if False else word_img.getpixel((0,0))
                
                # Simple heuristic: render and compare aspect ratio
                # We'll use a simple approach: measure how "tall" the font appears
                # by looking at the font's height characteristics
                
                # Get the font bounding box info
                ascent, descent, _, _ = font.get_font_bounding_box()
                height_ratio = (ascent + descent) / font_size if font_size > 0 else 0
                
                # Serif fonts typically have higher height ratios
                # and different stroke characteristics
                score = abs(height_ratio - 0.5)  # Prefer ratio near 0.5 as baseline
                
                if score > best_score:
                    best_score = score
                    best_font = font_name
            except Exception:
                continue
        
        # Map font to category
        font_name_lower = best_font.lower()
        if any(kw in font_name_lower for kw in ['times', 'garam', 'serif']):
            return 'serif'
        elif any(kw in font_name_lower for kw in ['arial', 'helvetica', 'swiss', 'sans']):
            return 'sans-serif'
        elif any(kw in font_name_lower for kw in ['courier', 'monospace', 'typewriter']):
            return 'monospace'
        else:
            # Default: if font has tall x-height, it's sans-serif; otherwise serif
            return 'sans-serif' if best_score > 0.45 else 'serif'
            
    except Exception as e:
        print(f"Font detection error: {e}")
        return 'serif'


def extract_font_info(block, img_array):
    """Extract font information for a text block by analyzing its word image region."""
    try:
        # Crop the word region from the original grayscale image
        h, w = img_array.shape[:2]
        x_start = max(0, block['x'])
        y_start = max(0, block['y'])
        x_end = min(w, block['x'] + block['w'])
        y_end = min(h, block['y'] + block['h'])
        
        if x_end <= x_start or y_end <= y_start:
            return 'serif'
        
        word_img_array = img_array[y_start:y_end, x_start:x_end]
        
        if word_img_array.size == 0:
            return 'serif'
        
        return detect_font_from_image(word_img_array, font_size=max(10, block['h'] * 2))
    except Exception as e:
        print(f"Extract font info error: {e}")
        return 'serif'

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=['*'],
    allow_credentials=True,
    allow_methods=['*'],
    allow_headers=['*'],
)

# @app.post('/api/extract')
# async def extract_text(file: UploadFile = File(...)):
#     contents = await file.read()
    
#     nparr = np.frombuffer(contents, np.uint8)
#     img = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
    
#     img_height, img_width = img.shape[:2]

#     # 1. Grayscale
#     gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
    
#     # 2. Bilateral Filter (Background noise / texture hatane ke liye par edges sharp rakhne ke liye)
#     denoised = cv2.bilateralFilter(gray, 9, 75, 75)
    
#     # 3. CLAHE Contrast Enhancement
#     clahe = cv2.createCLAHE(clipLimit=2.5, tileGridSize=(8,8))
#     enhanced = clahe.apply(denoised)

#     # 4. Otsu ki jagah Adaptive Thresholding (Watermarked/Scanned documents ke liye best)
#     thresh = cv2.adaptiveThreshold(
#         enhanced, 255, cv2.ADAPTIVE_THRESH_GAUSSIAN_C, cv2.THRESH_BINARY, 31, 11
#     )

#     # 5. Tesseract OCR with PSM 11 (Sparse text) ya PSM 3
#     custom_config = r'--oem 3 --psm 3'
#     data = pytesseract.image_to_data(thresh, config=custom_config, output_type=pytesseract.Output.DICT)
    
#     blocks = []
#     n_boxes = len(data['text'])
#     for i in range(n_boxes):
#         word = data['text'][i].strip()
#         conf = int(data['conf'][i])
        
#         # Confidence threshold thoda balanced rakhein
#         if word and conf > 25: 
#             blocks.append({
#                 "text": word,
#                 "x": data['left'][i],
#                 "y": data['top'][i], 
#                 "w": data['width'][i], 
#                 "h": data['height'][i] 
#             })
            
#     return {
#         "success": True,
#         "blocks": blocks,
#         "img_width": img_width,
#         "img_height": img_height
#     }

# from fastapi import FastAPI, UploadFile, File
# from fastapi.middleware.cors import CORSMiddleware
# import pytesseract
# import cv2
# import numpy as np

# app = FastAPI()

# app.add_middleware(
#     CORSMiddleware,
#     allow_origins=['*'],
#     allow_credentials=True,
#     allow_methods=['*'],
#     allow_headers=['*'],
# )

# @app.post('/api/extract')
# async def extract_text(file: UploadFile = File(...)):
#     contents = await file.read()
    
#     nparr = np.frombuffer(contents, np.uint8)
#     img = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
    
#     img_height, img_width = img.shape[:2]

#     # 1. Grayscale conversion
#     gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
    
#     # 2. Resize image up (2x) to make small/farthest text crystal clear for OCR precision
#     scale_factor = 2.0
#     resized = cv2.resize(gray, (int(img_width * scale_factor), int(img_height * scale_factor)), interpolation=cv2.INTER_CUBIC)

#     # 3. Advanced CLAHE (Contrast Limited Adaptive Histogram Equalization) for uneven backgrounds & watermarks
#     clahe = cv2.createCLAHE(clipLimit=3.0, tileGridSize=(8,8))
#     enhanced = clahe.apply(resized)

#     # 4. Tesseract OCR with PSM 11 (Sparse text / Find all text fragments) or PSM 3
#     custom_config = r'--oem 3 --psm 11'
#     data = pytesseract.image_to_data(enhanced, config=custom_config, output_type=pytesseract.Output.DICT)
    
#     blocks = []
#     n_boxes = len(data['text'])
#     for i in range(n_boxes):
#         word = data['text'][i].strip()
#         conf = int(data['conf'][i])
        
#         # Filter out empty or extremely low confidence garbage
#         if word and conf > 15:
#             # Scale coordinates back to original image dimensions
#             blocks.append({
#                 "text": word,
#                 "x": int(data['left'][i] / scale_factor),
#                 "y": int(data['top'][i] / scale_factor), 
#                 "w": int(data['width'][i] / scale_factor), 
#                 "h": int(data['height'][i] / scale_factor) 
#             })
            
#     return {
#         "success": True,
#         "blocks": blocks,
#         "img_width": img_width,
#         "img_height": img_height
#     }

@app.post('/api/extract')
async def extract_text(file: UploadFile = File(...)):
    contents = await file.read()
    nparr = np.frombuffer(contents, np.uint8)
    img = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
    
    img_height, img_width = img.shape[:2]

    # 1. Convert to Grayscale
    gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
    
    # 2. Background Division Normalization (Watermarks aur shadows hatane ke liye best method)
    # Background lighting aur emblem ko blur karke estimate karte hain
    blur = cv2.GaussianBlur(gray, (51, 51), 0)
    # Original image ko background se divide karke watermark vanish kar dete hain
    division = cv2.divide(gray, blur, scale=255)
    
    # 3. Clean thresholding to make text crisp black and background pure white
    _, thresh = cv2.threshold(division, 200, 255, cv2.THRESH_BINARY)

    # 4. Tesseract OCR with PSM 6 (Uniform text block layout)
    custom_config = r'--oem 3 --psm 6'
    data = pytesseract.image_to_data(thresh, config=custom_config, output_type=pytesseract.Output.DICT)
    
    blocks = []
    n_boxes = len(data['text'])
    for i in range(n_boxes):
        word = data['text'][i].strip()
        conf = int(data['conf'][i])
        
        # Filter: keep only alphanumeric words (letters and numbers, no special chars)
        # This drops noise, jargons, and garbled text
        if word and conf > 30 and re.match(r'^[\w\s]+$', word):
            # Scale coordinates - use full size for font detection, but keep original for positioning
            block = {
                "text": word,
                "x": data['left'][i],
                "y": data['top'][i], 
                "w": data['width'][i], 
                "h": data['height'][i]
            }
            # Extract font information for this block
            block["font"] = extract_font_info(block, gray)
            blocks.append(block)
    
    return {
        "success": True,
        "blocks": blocks,
        "img_width": img_width,
        "img_height": img_height
    }

@app.post('/api/generate-pdf')
async def generate_pdf(file: UploadFile = File(...)):
    """Generate a PDF with edited text using exact fonts from the scanned document."""
    contents = await file.read()
    nparr = np.frombuffer(contents, np.uint8)
    img = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
    
    img_height, img_width = img.shape[:2]
    gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
    
    # Background normalization
    blur = cv2.GaussianBlur(gray, (51, 51), 0)
    division = cv2.divide(gray, blur, scale=255)
    _, thresh = cv2.threshold(division, 200, 255, cv2.THRESH_BINARY)
    
    custom_config = r'--oem 3 --psm 6'
    data = pytesseract.image_to_data(thresh, config=custom_config, output_type=pytesseract.Output.DICT)
    
    from reportlab.lib.pagesizes import letter
    from reportlab.pdfgen import canvas as pdfcanvas
    from reportlab.lib.units import inch
    from reportlab.lib import colors
    
    buffer = BytesIO()
    
    # Use the extracted blocks with font info to generate PDF
    c = pdfcanvas(buffer, pagesize=letter)
    width, height = letter
    
    # Scale factors from image coordinates to PDF coordinates
    scale_x = width / img_width if img_width > 0 else 1
    scale_y = height / img_height if img_height > 0 else 1
    
    # Place each text block with its detected font
    for block in blocks:
        text = block['text']
        font_name = block['font']  # 'serif' or 'sans-serif'
        font_size = max(8, block['h'] * 1.2)
        
        # Map font category to actual reportlab font
        if font_name == 'serif':
            try:
                c.setFont('Times-Roman', font_size)
            except:
                c.setFont('Helvetica', font_size)
        else:
            try:
                c.setFont('Helvetica', font_size)
            except:
                c.setFont('Arial', font_size)
        
        # Position block (inverted Y for PDF coordinates, origin at bottom-left)
        pdf_x = block['x'] * scale_x
        pdf_y = height - block['y'] * scale_y - font_size
        
        c.drawString(pdf_x, pdf_y, text)
    
    c.showPage()
    c.save()
    
    buffer.seek(0)
    return {"success": True, "pdf_data": buffer.getvalue()[:100]}  # Return first 100 bytes as sample

@app.post('/api/extract-region')
async def extract_region(file: UploadFile = File(...)):
    """Extract text from a specific region of an image (cropped)."""
    contents = await file.read()
    nparr = np.frombuffer(contents, np.uint8)
    img = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
    
    if img is None:
        return {"success": False, "error": "Failed to decode image"}
    
    img_height, img_width = img.shape[:2]
    
    # Convert to grayscale and run the same OCR pipeline
    gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
    
    # Background division normalization (same as main extract)
    blur = cv2.GaussianBlur(gray, (51, 51), 0)
    division = cv2.divide(gray, blur, scale=255)
    _, thresh = cv2.threshold(division, 200, 255, cv2.THRESH_BINARY)
    
    custom_config = r'--oem 3 --psm 6'
    data = pytesseract.image_to_data(thresh, config=custom_config, output_type=pytesseract.Output.DICT)
    
    blocks = []
    n_boxes = len(data['text'])
    for i in range(n_boxes):
        word = data['text'][i].strip()
        conf = int(data['conf'][i])
        
        if word and conf > 40:
            blocks.append({
                "text": word,
                "x": data['left'][i],
                "y": data['top'][i], 
                "w": data['width'][i], 
                "h": data['height'][i]
            })
    
    return {
        "success": True,
        "text": " ".join([b['text'] for b in blocks]),
        "blocks": blocks
    }