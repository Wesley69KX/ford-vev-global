import os
import sys
import streamlit.web.bootstrap

if __name__ == '__main__':
    # Quando o PyInstaller roda em modo --onefile, ele descompacta tudo em sys._MEIPASS
    base_dir = getattr(sys, '_MEIPASS', os.path.dirname(os.path.abspath(__file__)))
    script_path = os.path.join(base_dir, 'app.py')
    
    # Adiciona a pasta base ao sys.path para garantir que imports locais funcionem
    sys.path.insert(0, base_dir)
    
    # Executa o Streamlit
    streamlit.web.bootstrap.run(script_path, '', [], flag_options={})
