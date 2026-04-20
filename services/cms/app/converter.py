"""DOCX image extraction utilities.

Extracts images in VISUAL ORDER from the document (same as markitdown), not
in relationships order. This ensures that the ![...] placeholders generated
by markitdown match 1:1 with the extracted files.
"""

import itertools
import logging
from pathlib import Path

from docx import Document

logger = logging.getLogger(__name__)

# XML attributes for image references (DrawingML and VML)
_EMBED = "{http://schemas.openxmlformats.org/officeDocument/2006/relationships}embed"
_R_ID  = "{http://schemas.openxmlformats.org/officeDocument/2006/relationships}id"


def extraer_imagenes_docx(path_docx: Path, output_folder: Path) -> list[Path]:
    """
    Extract images from the DOCX in visual order and save them into output_folder.
    Returns a list of Paths saved in the order they appear in the document.

    Uses doc.element.iter() to walk the XML in visual order (same as
    markitdown when generating placeholders), avoiding the relationships order
    returned by doc.part.rels.values() (which is the order of the .rels file,
    not the order of appearance in the text).
    """
    doc = Document(path_docx)
    output_folder.mkdir(parents=True, exist_ok=True)

    # Map rId -> relationship (images only)
    rels_map = {
        rid: rel
        for rid, rel in doc.part.rels.items()
        if "image" in rel.reltype
    }

    # Walk the document XML in visual order to collect rIds
    rids_en_orden: list[str] = []
    vistos: set[str] = set()
    for elem in doc.element.iter():
        tag = elem.tag.split("}")[-1] if "}" in elem.tag else elem.tag
        rid = None
        if tag == "blip":          # DrawingML (modern inline images)
            rid = elem.get(_EMBED)
        elif tag == "imagedata":   # VML (legacy images / WordArt)
            rid = elem.get(_R_ID)
        if rid and rid in rels_map and rid not in vistos:
            rids_en_orden.append(rid)
            vistos.add(rid)

    rutas_guardadas = []
    contador = itertools.count(1)

    try:
        for rid in rids_en_orden:
            rel = rels_map[rid]
            data = rel.target_part.blob
            extension = Path(rel.target_ref).suffix or ".png"
            filename = f"imagen_{next(contador):03d}{extension}"
            filepath = output_folder / filename

            with filepath.open("wb") as f:
                f.write(data)
            rutas_guardadas.append(filepath)

        logger.info("%d images extracted into '%s'", len(rutas_guardadas), output_folder)

    except Exception as e:
        logger.error("Error extracting images: %s", e, exc_info=True)

    return rutas_guardadas
