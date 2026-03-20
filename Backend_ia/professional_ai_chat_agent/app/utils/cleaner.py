import re

def limpiar_respuesta(texto: str) -> str:
    if not texto:
        return texto

    texto = texto.replace("\u00A0", " ")

    # eliminar bloques de código ``` ```
    texto = re.sub(r"```.*?```", "", texto, flags=re.DOTALL)

    # PROTEGER etiquetas HTML de tablas ANTES de limpiar markdown
    # Usar marcadores sin guiones bajos para evitar que se eliminen
    proteccion = [
        ("<table", "<<<TABLE>>>"),
        ("</table>", "<<<TABLEEND>>>"),
        ("<thead>", "<<<THEAD>>>"),
        ("</thead>", "<<<THEADEND>>>"),
        ("<tbody>", "<<<TBODY>>>"),
        ("</tbody>", "<<<TBODYEND>>>"),
        ("<tr>", "<<<TR>>>"),
        ("</tr>", "<<<TREND>>>"),
        ("<th>", "<<<TH>>>"),
        ("</th>", "<<<THEND>>>"),
        ("<td>", "<<<TD>>>"),
        ("</td>", "<<<TDEND>>>"),
    ]
    
    for original, marca in proteccion:
        texto = texto.replace(original, marca)

    # eliminar markdown básico (quitando < y > de la regex)
    texto = re.sub(r"[`*_#]+", "", texto)

    # RESTAURAR etiquetas HTML de tablas
    for original, marca in proteccion:
        texto = texto.replace(marca, original)

    # eliminar listas markdown
    texto = re.sub(r"^\s*[-•]\s+", "", texto, flags=re.MULTILINE)

    # eliminar enlaces markdown [texto](url)
    texto = re.sub(r"\[(.*?)\]\(.*?\)", r"\1", texto)

    # eliminar separadores tipo --- o ***
    texto = re.sub(r"[-]{3,}", "", texto)

    # normalizar saltos de línea excesivos
    texto = re.sub(r"\n{2,}", "\n", texto)

    # normalizar espacios
    texto = re.sub(r"[ \t]+", " ", texto)

    return texto.strip()