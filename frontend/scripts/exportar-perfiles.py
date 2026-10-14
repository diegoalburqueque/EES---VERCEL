# Exporta SOLO la hoja "Hoja1" de la planilla de perfiles a JSON (las otras hojas traen claves
# de CeroFilas en texto plano y no deben pasar por acá).
#   python -I scripts/exportar-perfiles.py "PERFILES HABILITADOS SALUD 360.xlsx" salida.json
import json
import sys

import openpyxl

wb = openpyxl.load_workbook(sys.argv[1], read_only=True)
filas = [r for r in wb["Hoja1"].iter_rows(min_row=2, values_only=True) if r[0]]
datos = [
    dict(n=r[0], nombre=r[1], apellidos=r[2], run=r[3], correo=r[4], profesion=r[5], rol=r[6])
    for r in filas
]
with open(sys.argv[2], "w", encoding="utf-8") as f:
    json.dump(datos, f, ensure_ascii=False)
print(len(datos), "perfiles")
