# -*- coding: utf-8 -*-
import json
import os

def main():
    json_path = 'scratch/processed_products.json'
    processed = {}
    if os.path.exists(json_path):
        try:
            with open(json_path, 'r', encoding='utf-8') as f:
                processed = json.load(f)
        except Exception:
            pass
            
    product_ids = [
        "prod_listerine_750",
        "prod_nutrena_organic_6",
        "prod_tefal_pan_24",
        "prod_atopalm_wash_460",
        "prod_frosch_detergent_3"
    ]
    
    for pid in product_ids:
        processed[pid] = True
        
    with open(json_path, 'w', encoding='utf-8') as f:
        json.dump(processed, f, ensure_ascii=False, indent=2)
    print("Successfully saved processed products to local database scratch/processed_products.json!")

if __name__ == '__main__':
    main()
