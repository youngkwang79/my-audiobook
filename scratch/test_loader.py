import sys
import os

sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from api_key_loader import get_api_key

print("Current Working Directory:", os.getcwd())
print("Loader path:", os.path.dirname(os.path.abspath(__file__)))
print("ANTHROPIC_API_KEY:", get_api_key("ANTHROPIC_API_KEY"))
