@echo off
echo Activating conda environment...
call conda activate llm-py310

echo Installing required packages...
pip install transformers torch torchvision torchaudio accelerate bitsandbytes psutil

echo Running LLM Library test...
cd src
python test_llm_library.py

echo Test completed!
pause 