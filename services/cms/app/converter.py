"""DOCX image extraction utilities.

Extrae imágenes en ORDEN VISUAL del documento (igual que markitdown), no en
orden de relaciones. Esto garantiza que los placeholders ![...] generados por
markitdown coincidan 1:1 con los archivos extraídos.
"""

import itertools
import logging
from pathlib import Path

from docx import Document

logger = logging.getLogger(__name__)

# Atributos XML para referencias de imagen (DrawingML y VML)
_EMBED = "{http://schemas.openxmlformats.org/officeDocument/2006/relationships}embed"
_R_ID  = "{http://schemas.openxmlformats.org/officeDocument/2006/relationships}id"


def extraer_imagenes_docx(path_docx: Path, output_folder: Path) -> list[Path]:
    """
    Extrae imágenes del DOCX en orden visual y las guarda en output_folder.
    Retorna una lista de Paths guardados en orden de aparición en el documento.

    Usa doc.element.iter() para recorrer el XML en orden visual (igual que
    markitdown al generar placeholders), evitando el orden de relaciones que
    devuelve doc.part.rels.values() (que es el orden del archivo .rels, no
    el orden de aparición en el texto).
    """
    doc = Document(path_docx)
    output_folder.mkdir(parents=True, exist_ok=True)

    # Mapa rId -> relación (solo imágenes)
    rels_map = {
        rid: rel
        for rid, rel in doc.part.rels.items()
        if "image" in rel.reltype
    }

    # Recorrer el XML del documento en orden visual para obtener los rIds
    rids_en_orden: list[str] = []
    vistos: set[str] = set()
    for elem in doc.element.iter():
        tag = elem.tag.split("}")[-1] if "}" in elem.tag else elem.tag
        rid = None
        if tag == "blip":          # DrawingML (imágenes inline modernas)
            rid = elem.get(_EMBED)
        elif tag == "imagedata":   # VML (imágenes legacy / WordArt)
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

        logger.info("%d imágenes extraídas en '%s'", len(rutas_guardadas), output_folder)

    except Exception as e:
        logger.error("Error extrayendo imágenes: %s", e, exc_info=True)

    return rutas_guardadas
