
from modules import script_callbacks
from typing import Optional

from gradio import Blocks
import fastapi
from fastapi import FastAPI, HTTPException, status
from fastapi.responses import FileResponse
import zipfile
import glob
import os
from tempfile import NamedTemporaryFile
from modules.shared import opts
import datetime


def on_app_started(demo: Optional[Blocks], app: FastAPI):
    def get_current_user(request: fastapi.Request) -> Optional[str]:
        token = request.cookies.get("access-token") or request.cookies.get(
            "access-token-unsecure"
        )
        return app.tokens.get(token)
    
    def download_outputs(request: fastapi.Request):
        user = get_current_user(request)
        if app.auth is None or user is not None:
            with NamedTemporaryFile(delete=False) as tmpfile:
                with zipfile.ZipFile(tmpfile, mode="w") as zip:
                    basedir = os.path.abspath(opts.outdir_samples or opts.outdir_txt2img_samples)
                    for filepath in glob.glob(os.path.join(basedir, "**/*"), recursive=True):
                        relpath = os.path.relpath(filepath, basedir)
                        zip.write(filename=filepath, arcname=relpath)
                        
                dt_now = datetime.datetime.now()
                return FileResponse(
                    path=tmpfile.name,
                    filename=dt_now.strftime("%Y%m%d_%H%M%S")+".zip",
                    media_type="application/zip"
                )
                    
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED, detail="Not authenticated"
        )
    app.add_api_route("/webui_output_download_outputs", download_outputs, methods=["GET"])

script_callbacks.on_app_started(on_app_started)