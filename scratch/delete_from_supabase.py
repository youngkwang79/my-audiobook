# -*- coding: utf-8 -*-
import os
import requests

# Load env variables
SUPABASE_URL = ""
SUPABASE_KEY = ""

env_path = ".env.local"
if os.path.exists(env_path):
    with open(env_path, "r", encoding="utf-8") as f:
        for line in f:
            line = line.strip()
            if line and not line.startswith("#") and "=" in line:
                parts = line.split("=", 1)
                k = parts[0].strip()
                v = parts[1].strip().replace('"', '').replace("'", "")
                if k == "NEXT_PUBLIC_SUPABASE_URL":
                    SUPABASE_URL = v
                elif k == "SUPABASE_SERVICE_ROLE_KEY":
                    SUPABASE_KEY = v

def delete_from_supabase(prod_id):
    if not SUPABASE_URL or not SUPABASE_KEY:
        return
    url = f"{SUPABASE_URL}/rest/v1/works?id=eq.{prod_id}"
    headers = {
        "apikey": SUPABASE_KEY,
        "Authorization": f"Bearer {SUPABASE_KEY}"
    }
    r = requests.delete(url, headers=headers)
    if r.status_code in [200, 204]:
        print(f"Successfully deleted {prod_id} from Supabase works table!")
    else:
        print(f"Failed to delete {prod_id}: {r.status_code} {r.text}")

def main():
    product_ids = [
        "prod_listerine_750",
        "prod_nutrena_organic_6",
        "prod_tefal_pan_24",
        "prod_atopalm_wash_460",
        "prod_frosch_detergent_3"
    ]
    for pid in product_ids:
        delete_from_supabase(pid)

if __name__ == '__main__':
    main()
