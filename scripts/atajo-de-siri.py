#!/usr/bin/env python3
"""
El Atajo de Siri «Luxury» (8 de octubre), generado y firmado en una Mac:

    python3 scripts/atajo-de-siri.py https://luxuryatelier.net public/siri/Luxury.shortcut

Cuatro acciones: la llave (se pregunta al instalarlo), Dictar texto, Obtener contenido de URL (POST a
/panel/luxury/siri con `Authorization: Bearer <llave>` y JSON `texto`) y Leer texto. Se firma con
`shortcuts sign --mode anyone` (hace falta macOS con sesión de iCloud): sin firma, iOS no lo importa.
"""
import plistlib
import subprocess
import sys
import tempfile
import uuid

sitio, salida = sys.argv[1].rstrip('/'), sys.argv[2]
LLAVE, DICTADO, RESPUESTA = (str(uuid.uuid4()).upper() for _ in range(3))
HUECO = '￼'


def salida_de(uid, nombre):
    return {'OutputUUID': uid, 'Type': 'ActionOutput', 'OutputName': nombre}


def texto(cadena, adjuntos=None):
    valor = {'string': cadena}
    if adjuntos:
        valor['attachmentsByRange'] = adjuntos
    return {'Value': valor, 'WFSerializationType': 'WFTextTokenString'}


def diccionario(pares):
    return {
        'Value': {'WFDictionaryFieldValueItems': [{'WFItemType': 0, 'WFKey': texto(k), 'WFValue': v} for k, v in pares]},
        'WFSerializationType': 'WFDictionaryFieldValue',
    }


acciones = [
    {'WFWorkflowActionIdentifier': 'is.workflow.actions.gettext', 'WFWorkflowActionParameters': {'UUID': LLAVE, 'WFTextActionText': ''}},
    {'WFWorkflowActionIdentifier': 'is.workflow.actions.dictatetext', 'WFWorkflowActionParameters': {'UUID': DICTADO, 'WFDictateTextStopListening': 'After Pause'}},
    {
        'WFWorkflowActionIdentifier': 'is.workflow.actions.downloadurl',
        'WFWorkflowActionParameters': {
            'UUID': RESPUESTA,
            'WFURL': f'{sitio}/panel/luxury/siri',
            'WFHTTPMethod': 'POST',
            'ShowHeaders': True,
            'WFHTTPHeaders': diccionario([('Authorization', texto(f'Bearer {HUECO}', {'{7, 1}': salida_de(LLAVE, 'Texto')}))]),
            'WFHTTPBodyType': 'JSON',
            'WFJSONValues': diccionario([('texto', texto(HUECO, {'{0, 1}': salida_de(DICTADO, 'Texto dictado')}))]),
        },
    },
    {'WFWorkflowActionIdentifier': 'is.workflow.actions.speaktext', 'WFWorkflowActionParameters': {'WFText': texto(HUECO, {'{0, 1}': salida_de(RESPUESTA, 'Contenido de URL')})}},
]

atajo = {
    'WFWorkflowClientVersion': '2607.0.2',
    'WFWorkflowMinimumClientVersion': 900,
    'WFWorkflowMinimumClientVersionString': '900',
    'WFWorkflowIcon': {'WFWorkflowIconStartColor': 463140863, 'WFWorkflowIconGlyphNumber': 59511},
    'WFWorkflowTypes': ['Watch', 'NCWidget'],
    'WFWorkflowInputContentItemClasses': ['WFStringContentItem'],
    'WFWorkflowHasShortcutInputVariables': False,
    'WFWorkflowImportQuestions': [
        {'ActionIndex': 0, 'Category': 'Parameter', 'ParameterKey': 'WFTextActionText', 'DefaultValue': '', 'Text': 'Pega tu llave de Siri (Mi cuenta › Luxury con Siri, en el panel de Luxury Atelier)'}
    ],
    'WFWorkflowActions': acciones,
}

with tempfile.NamedTemporaryFile(suffix='.shortcut', delete=False) as sin_firmar:
    plistlib.dump(atajo, sin_firmar, fmt=plistlib.FMT_BINARY)
subprocess.run(['shortcuts', 'sign', '--mode', 'anyone', '--input', sin_firmar.name, '--output', salida], check=True)
print(f'Firmado: {salida}')
