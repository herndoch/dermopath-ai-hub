import json
import os
from urllib.parse import urlparse, parse_qs

def update_json(file_path):
    with open(file_path, 'r') as f:
        data = json.load(f)

    updated_count = 0
    for item in data:
        media_list = item.get('media', [])
        related_figures = item.get('related_figures', [])
        
        all_media = media_list + related_figures
        
        for media in all_media:
            if media.get('type') == 'wsi':
                url = media.get('url') or media.get('wsi_link')
                if not url:
                    continue
                
                # MGH logic
                if 'learn.mghpathology.org/index.php/' in url:
                    if not media.get('path'):
                        thumbnail = url.replace('index.php/', 'pv-http/openslide/') + '/thumbnail.jpg'
                        media['path'] = thumbnail
                        updated_count += 1
                
                # Leeds logic
                elif 'virtualpathology.leeds.ac.uk/slides/library/view.php?path=' in url:
                    if not media.get('path'):
                        parsed_url = urlparse(url)
                        query_params = parse_qs(parsed_url.query)
                        slide_path = query_params.get('path', [None])[0]
                        if slide_path:
                            thumbnail = f"https://images.virtualpathology.leeds.ac.uk{slide_path}?-1"
                            media['path'] = thumbnail
                            updated_count += 1

    with open(file_path, 'w') as f:
        json.dump(data, f, indent=4)
    
    print(f"Updated {updated_count} WSI thumbnail paths in {file_path}")

if __name__ == "__main__":
    update_json('Skin_Global_Leaf_Optimized.json')
