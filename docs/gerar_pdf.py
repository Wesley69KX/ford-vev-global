import re, os
from fpdf import FPDF

ABNT_TOP = 30
ABNT_BOTTOM = 20
ABNT_LEFT = 30
ABNT_RIGHT = 20
BODY_SIZE = 11
TITLE_SIZE = 16
H1_SIZE = 14
H2_SIZE = 12
H3_SIZE = 11
LINE_H = 6.5

FONTS_DIR = "C:\\Windows\\Fonts"
FONT = "TNR"
FONT_CODE = "CNew"

MD_DIR = os.path.dirname(os.path.abspath(__file__))
OUT_DIR = os.path.join(MD_DIR, "pdf")


def sanitize(text):
    """Replace chars that cause issues with core fonts."""
    replacements = {
        "\u250c": "+", "\u2514": "+", "\u2518": "+", "\u2510": "+",
        "\u2502": "|", "\u2500": "-", "\u251c": "+", "\u2524": "+",
        "\u2534": "+", "\u252c": "+", "\u253c": "+",
        "\u2192": "->", "\u2190": "<-", "\u2191": "^", "\u2193": "v",
        "\u2714": "/", "\u2716": "x",
        "\u2014": "-", "\u2013": "-",
        "\u2018": "'", "\u2019": "'",
        "\u201c": '"', "\u201d": '"',
        "\u2022": "*", "\u2026": "...",
        "\u00b0": "°",
        "\u03c3": "sigma",
    }
    for old, new in replacements.items():
        text = text.replace(old, new)
    return text


class ABNT_PDF(FPDF):
    def __init__(self):
        super().__init__(orientation="P", unit="mm", format="A4")
        self.set_auto_page_break(auto=True, margin=ABNT_BOTTOM)
        self.section_counters = [0, 0, 0]
        self.section_level = 0
        self.add_font(FONT, "", os.path.join(FONTS_DIR, "times.ttf"))
        self.add_font(FONT, "B", os.path.join(FONTS_DIR, "timesbd.ttf"))
        self.add_font(FONT, "I", os.path.join(FONTS_DIR, "timesi.ttf"))
        self.add_font(FONT, "BI", os.path.join(FONTS_DIR, "timesbi.ttf"))
        self.add_font(FONT_CODE, "", os.path.join(FONTS_DIR, "cour.ttf"))
        self.add_font(FONT_CODE, "B", os.path.join(FONTS_DIR, "courbd.ttf"))

    def header(self):
        if self.page_no() <= 1:
            return
        self.set_font(FONT, "I", 8)
        self.set_text_color(120, 120, 120)
        self.cell(0, 5, "Ford VEV - Proving Ground Operational System", align="L")
        self.ln(8)
        self.set_draw_color(0, 44, 91)
        self.set_line_width(0.4)
        self.line(ABNT_LEFT, self.get_y(), 210 - ABNT_RIGHT, self.get_y())
        self.ln(4)

    def footer(self):
        if self.page_no() <= 1:
            return
        self.set_y(-ABNT_BOTTOM + 5)
        self.set_font(FONT, "", 9)
        self.set_text_color(80, 80, 80)
        self.cell(0, 5, f"{self.page_no()}", align="C")

    def chapter_title(self, title, level=1):
        self.ln(4)
        if level == 0:
            self.section_counters = [0, 0, 0]
            self.section_level = 0
            self.set_font(FONT, "B", TITLE_SIZE)
            self.set_text_color(0, 44, 91)
            self.multi_cell(0, 10, title, align="C")
            self.ln(4)
            self.set_draw_color(0, 44, 91)
            self.set_line_width(0.6)
            self.line(ABNT_LEFT, self.get_y(), 210 - ABNT_RIGHT, self.get_y())
            self.ln(6)
            return
        if level == 1:
            self.section_counters[0] += 1
            self.section_counters[1] = 0
            self.section_counters[2] = 0
            num = f"{self.section_counters[0]}"
            fs = H1_SIZE
        elif level == 2:
            self.section_counters[1] += 1
            self.section_counters[2] = 0
            num = f"{self.section_counters[0]}.{self.section_counters[1]}"
            fs = H2_SIZE
        else:
            self.section_counters[2] += 1
            num = f"{self.section_counters[0]}.{self.section_counters[1]}.{self.section_counters[2]}"
            fs = H3_SIZE
        self.set_font(FONT, "B", fs)
        self.set_text_color(0, 44, 91)
        label = f"{num}  {title}" if level <= 2 else title
        self.multi_cell(0, 8, label)
        self.ln(2)

    def body_text(self, text):
        self.set_font(FONT, "", BODY_SIZE)
        self.set_text_color(30, 30, 30)
        clean = re.sub(r"\*\*(.+?)\*\*", r"\1", text)
        clean = re.sub(r"\*(.+?)\*", r"\1", clean)
        clean = re.sub(r"`(.+?)`", r"\1", clean)
        clean = re.sub(r"\[(.+?)\]\(.+?\)", r"\1", clean)
        clean = clean.replace("```", "").replace("``", "").replace("''", "'").replace('""', '"')
        self.multi_cell(0, LINE_H, sanitize(clean))
        self.ln(1)

    def code_block(self, text):
        self.ln(2)
        self.set_fill_color(240, 242, 245)
        self.set_draw_color(200, 200, 205)
        y = self.get_y()
        lines = text.split("\n")
        block_h = len(lines) * 5 + 6
        if self.get_y() + block_h > 297 - ABNT_BOTTOM:
            self.add_page()
            y = self.get_y()
        self.rect(ABNT_LEFT, y, 210 - ABNT_LEFT - ABNT_RIGHT, block_h, "DF")
        self.set_xy(ABNT_LEFT + 3, y + 3)
        self.set_font(FONT_CODE, "", 8)
        self.set_text_color(50, 50, 50)
        for line in lines:
            safe = sanitize(line)[:110].expandtabs(2)
            self.cell(0, 5, safe)
            self.ln(5)
        self.ln(4)

    def bullet_list(self, items):
        self.set_font(FONT, "", BODY_SIZE)
        self.set_text_color(30, 30, 30)
        for item in items:
            clean = re.sub(r"\*\*(.+?)\*\*", r"\1", item)
            clean = re.sub(r"`(.+?)`", r"\1", clean)
            self.cell(8)
            self.multi_cell(0, LINE_H, sanitize(f"-  {clean}"))
            self.ln(0.5)

    def table(self, headers, rows):
        self.ln(2)
        col_w = (210 - ABNT_LEFT - ABNT_RIGHT) / len(headers)
        self.set_font(FONT, "B", 9)
        self.set_fill_color(0, 44, 91)
        self.set_text_color(255, 255, 255)
        for h in headers:
            self.cell(col_w, 7, sanitize(h), border=1, fill=True, align="C")
        self.ln()
        self.set_font(FONT, "", 9)
        self.set_text_color(30, 30, 30)
        for idx, row in enumerate(rows):
            fill = False
            if idx % 2 == 1:
                self.set_fill_color(245, 245, 250)
                fill = True
            for i, cell in enumerate(row):
                self.cell(col_w, 6, sanitize(str(cell)[:40]), border=1, fill=fill, align="C" if i > 0 else "L")
            self.ln()
        self.ln(3)


def render_md_to_pdf(pdf, md_text):
    lines = md_text.split("\n")
    i = 0
    in_code = False
    code_buf = []
    in_table = False
    table_headers = []
    table_rows = []
    in_list = False
    list_buf = []

    while i < len(lines):
        line = lines[i]

        if line.startswith("```"):
            if in_code:
                pdf.code_block("\n".join(code_buf))
                code_buf = []
                in_code = False
            else:
                in_code = True
                code_buf = []
            i += 1
            continue

        if in_code:
            code_buf.append(line)
            i += 1
            continue

        if "|" in line and line.strip().startswith("|"):
            parts = [p.strip() for p in line.split("|") if p.strip()]
            if not parts:
                i += 1
                continue
            next_line = lines[i + 1] if i + 1 < len(lines) else ""
            if re.match(r"^\|[:\- ]+\|", next_line) and not in_table:
                in_table = True
                table_headers = parts
                i += 2
                continue
            elif in_table:
                table_rows.append(parts)
                i += 1
                continue
            else:
                table_headers = parts
                in_table = True
                i += 1
                continue
        else:
            if in_table and table_rows:
                pdf.table(table_headers, table_rows)
                table_headers = []
                table_rows = []
                in_table = False
            elif in_table and not table_rows:
                in_table = False

        stripped = line.strip()

        if not stripped:
            if in_list and list_buf:
                pdf.bullet_list(list_buf)
                list_buf = []
                in_list = False
            i += 1
            continue

        if stripped.startswith("# ") and i < 3:
            i += 1
            continue

        if stripped.startswith("# "):
            pdf.chapter_title(stripped[2:], level=0)
            i += 1
            continue

        if stripped.startswith("## "):
            pdf.chapter_title(stripped[3:], level=1)
            i += 1
            continue

        if stripped.startswith("### "):
            pdf.chapter_title(stripped[4:], level=2)
            i += 1
            continue

        if stripped.startswith("- ") or stripped.startswith("* "):
            in_list = True
            list_buf.append(stripped[2:])
            i += 1
            continue

        if in_list:
            pdf.bullet_list(list_buf)
            list_buf = []
            in_list = False

        if stripped.startswith("|"):
            i += 1
            continue

        pdf.body_text(stripped)
        i += 1

    if in_list and list_buf:
        pdf.bullet_list(list_buf)
    if in_table and table_rows:
        pdf.table(table_headers, table_rows)


FILES = [
    ("README.md", "Visao Geral do Projeto"),
    ("DATA_COLLECTION.md", "Aplicativo de Coleta de Dados - PWA"),
    ("ANALYTICS_DASHBOARD.md", "Painel de Analises - Streamlit"),
    ("DATABASE.md", "Referencia do Banco de Dados - Firebase"),
    ("DEPLOYMENT.md", "Guia de Implantacao e Deploy"),
]

if __name__ == "__main__":
    os.makedirs(OUT_DIR, exist_ok=True)

    for fname, subtitle in FILES:
        md_path = os.path.join(MD_DIR, fname)
        if not os.path.exists(md_path):
            print(f"[SKIP] {fname} not found")
            continue

        pdf = ABNT_PDF()
        pdf.alias_nb_pages()
        pdf.add_page()

        pdf.ln(50)
        pdf.set_font(FONT, "B", 24)
        pdf.set_text_color(0, 44, 91)
        pdf.multi_cell(0, 12, "FORD VEV", align="C")
        pdf.ln(4)
        pdf.set_font(FONT, "", 14)
        pdf.set_text_color(60, 60, 60)
        pdf.multi_cell(0, 8, "Proving Ground Operational System", align="C")
        pdf.ln(10)
        pdf.set_draw_color(0, 44, 91)
        pdf.set_line_width(0.6)
        pdf.line(60, pdf.get_y(), 150, pdf.get_y())
        pdf.ln(10)
        pdf.set_font(FONT, "B", 16)
        pdf.set_text_color(0, 44, 91)
        pdf.multi_cell(0, 10, subtitle, align="C")
        pdf.ln(20)
        pdf.set_font(FONT, "", 11)
        pdf.set_text_color(100, 100, 100)
        pdf.cell(0, 6, "Documentacao Tecnica - ABNT NBR 14724", align="C")
        pdf.ln(7)
        from datetime import datetime
        pdf.cell(0, 6, f"Gerado em {datetime.now().strftime('%d/%m/%Y')}", align="C")

        pdf.add_page()

        with open(md_path, encoding="utf-8") as f:
            md_text = f.read()
        render_md_to_pdf(pdf, md_text)

        out_path = os.path.join(OUT_DIR, fname.replace(".md", ".pdf"))
        pdf.output(out_path)
        print(f"[OK] {fname} -> {out_path}")
