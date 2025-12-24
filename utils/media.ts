
export const getImageUrl = (path: string | null) => {
    if (!path) return null;

    // Check if it's a PathPresenter Azure Blob URL
    const isPathPresenterBlob = path.includes('pathpresenter.blob.core.windows.net');

    if (isPathPresenterBlob) {
        // Heuristic: If it has an expiry 'se=' parameter, check if it's likely expired
        const match = path.match(/se=([^&]+)/);
        if (match) {
            try {
                const expiryStr = decodeURIComponent(match[1]);
                const expiryDate = new Date(expiryStr);

                // If Invalid Date, assume expired/broken
                if (isNaN(expiryDate.getTime())) {
                    console.warn("Invalid PathPresenter Expiry Date:", expiryStr);
                    return null;
                }

                // Buffer: consider expired if within 1 hour of expiry (to account for time drift)
                // Actually, just strict check
                if (expiryDate < new Date()) {
                    console.warn("PathPresenter Link Expired:", expiryStr);
                    return null;
                }
            } catch (e) {
                console.error("Error checking expiry:", e);
                return null;
            }
        } else {
            // If looks like an Azure SAS URL but missing 'se', it might be weird.
            // But existing logic let it pass. Let's keep it unless it breaks.
        }
    }

    if (path.startsWith('gs://')) {
        return path.replace('gs://', 'https://storage.googleapis.com/');
    }

    if (path.startsWith('http')) {
        // BLOCK WHO WSI/Figures due to hotlinking protection/403/404s
        if (path.includes('tumourclassification.iarc.who.int')) {
            return null;
        }

        // WHO WSI Thumbnail Logic (Legacy - if we ever enable it again)
        /*
        if (path.includes('tumourclassification.iarc.who.int/Viewer/Index2?fid=')) {
            const match = path.match(/fid=(\d+)/);
            if (match && match[1]) {
                return `https://tumourclassification.iarc.who.int/static/dzi/${match[1]}_files/10/0_0.jpeg`;
            }
        }
        */

        return path;
    }

    // Handle relative paths (e.g. source_videos/... or _asset_library/...)
    // Handle relative paths (e.g. source_videos/... or _asset_library/...)
    // Handle relative paths (e.g. source_videos/... or _asset_library/...)
    const baseUrl = "https://storage.googleapis.com/pathology-hub-0/";
    // 4. Handle relative paths (Textbooks, Lectures)
    // Some paths in JSON are missing the '_asset_library/' prefix (e.g. "textbooks/...")
    // We normalize them here to ensure they point to the correct GCS location.
    let cleanPath = path.startsWith('/') ? path.substring(1) : path;

    if (!cleanPath.startsWith('_asset_library/') && (cleanPath.startsWith('textbooks/') || cleanPath.startsWith('lectures/'))) {
        cleanPath = `_asset_library/${cleanPath}`;
    }

    if (cleanPath.includes('/')) {
        return `${baseUrl}${cleanPath}`;
    }

    const hash = path.split('').reduce((a, b) => { a = ((a << 5) - a) + b.charCodeAt(0); return a & a }, 0);
    return `https://picsum.photos/seed/${Math.abs(hash)}/400/300`;
};

