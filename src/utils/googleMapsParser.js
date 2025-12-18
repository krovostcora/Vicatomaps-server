// src/utils/googleMapsParser.js
const axios = require('axios');

class GoogleMapsParser {
    /**
     * Parses Google Maps URL and extracts origin, destination, waypoints
     * Supported formats:
     * - Short URLs: https://maps.app.goo.gl/xxx
     * - Full URLs: https://www.google.com/maps/dir/54.6872,25.2797/54.8978,23.9094/
     * - URLs with places: https://www.google.com/maps/dir/Vilnius/Kaunas/
     */
    async parseGoogleMapsUrl(url) {
        try {
            console.log('Parsing Google Maps URL:', url);

            // Clean URL without extra parameters (g_st, g_ep, etc.)
            let cleanUrl = url.split('?')[0];  // remove everything after ?
            console.log('Cleaned URL:', cleanUrl);

            // If this is a short URL - expand it
            let fullUrl = cleanUrl;
            if (cleanUrl.includes('maps.app.goo.gl') || cleanUrl.includes('goo.gl')) {
                fullUrl = await this.expandShortUrl(cleanUrl);
                console.log('Expanded URL:', fullUrl);
            }

            // Parse full URL
            const result = this.parseFullUrl(fullUrl);
            
            if (!result.origin || !result.destination) {
                throw new Error('Could not extract origin and destination from URL');
            }

            console.log('Parsed result:', result);
            return result;

        } catch (error) {
            console.error('Error parsing Google Maps URL:', error);
            throw new Error(`Failed to parse Google Maps URL: ${error.message}`);
        }
    }

    /**
     * Expands short URL to full URL via HTTP redirect
     */
    async expandShortUrl(shortUrl) {
        try {
            const response = await axios.get(shortUrl, {
                maxRedirects: 0,
                validateStatus: (status) => status === 302 || status === 301
            });

            const location = response.headers.location;
            if (!location) {
                throw new Error('No redirect location found');
            }

            return location;

        } catch (error) {
            // If axios automatically followed the redirect
            if (error.response && error.response.request) {
                const finalUrl = error.response.request.res.responseUrl;
                if (finalUrl) return finalUrl;
            }

            // Alternative approach - just make a request and see where it redirects
            try {
                const response = await axios.get(shortUrl, {
                    maxRedirects: 5
                });
                return response.request.res.responseUrl || shortUrl;
            } catch (e) {
                throw new Error('Could not expand short URL');
            }
        }
    }

    /**
     * Parses full Google Maps URL
     * Example formats:
     * - /dir/54.6872,25.2797/54.8978,23.9094/
     * - /dir/Vilnius/Kaunas/
     * - /?daddr=Kaunas&saddr=Vilnius (old mobile format)
     * - /dir/Ljubljana,+Slovenia/Lviv,+Ukraine/@47.9,13.9,6z/data=...
     */
    parseFullUrl(url) {
        try {
            const urlObj = new URL(url);
            const pathname = urlObj.pathname;
            const searchParams = urlObj.searchParams;

            console.log('Parsing pathname:', pathname);
            console.log('Search params:', [...searchParams.entries()]);

            // FORMAT 1: Old format with query parameters (?daddr=...&saddr=...)
            if (searchParams.has('daddr') || searchParams.has('saddr')) {
                console.log('Detected old query-based format');
                return this.parseQueryBasedUrl(searchParams);
            }

            // FORMAT 2: Data parameter (encoded route info)
            const dataMatch = url.match(/data=([^&]+)/);
            if (dataMatch) {
                try {
                    const coordinates = this.parseDataParameter(dataMatch[1]);
                    if (coordinates) {
                        console.log('Parsed from data parameter:', coordinates);
                        return coordinates;
                    }
                } catch (e) {
                    console.log('Failed to parse data parameter, falling back to path parsing');
                }
            }

            // FORMAT 3: Path-based (/dir/...)
            const dirMatch = pathname.match(/\/dir\/([^/]+)(?:\/([^/?]+))?(?:\/([^/@?]+))?/);
            
            if (!dirMatch) {
                throw new Error('Invalid Google Maps directions URL format');
            }

            let points = [dirMatch[1], dirMatch[2], dirMatch[3]]
                .filter(Boolean)
                .filter(p => {
                    // Filter out viewport/zoom parameters (start with @)
                    if (p.startsWith('@')) {
                        console.log('Skipping viewport parameter:', p);
                        return false;
                    }
                    return true;
                });

            console.log('Extracted points:', points);

            if (points.length < 2) {
                throw new Error('Need at least origin and destination');
            }

            const result = {
                origin: this.parsePoint(points[0]),
                destination: this.parsePoint(points[points.length - 1]),
                waypoints: []
            };

            // If there are intermediate points (waypoints)
            if (points.length > 2) {
                result.waypoints = points.slice(1, -1).map(point => this.parsePoint(point));
            }

            return result;

        } catch (error) {
            console.error('Error parsing full URL:', error);
            throw error;
        }
    }

    /**
     * Parses old Google Maps format with query parameters
     * Format: ?daddr=Kaunas&saddr=Vilnius or ?daddr=54.89,23.90&saddr=54.68,25.27
     */
    parseQueryBasedUrl(searchParams) {
        const daddr = searchParams.get('daddr');
        const saddr = searchParams.get('saddr');

        console.log('Parsing query-based URL:');
        console.log('\tsaddr (origin):', saddr);
        console.log('\tdaddr (destination):', daddr);

        if (!saddr || !daddr) {
            throw new Error('Missing saddr or daddr in URL');
        }

        const result = {
            origin: this.parsePoint(decodeURIComponent(saddr)),
            destination: this.parsePoint(decodeURIComponent(daddr)),
            waypoints: []
        };

        console.log('Parsed query-based URL:', result);
        return result;
    }

    /**
     * Parses data= parameter from Google Maps URL
     * Extracts coordinates from encoded data
     */
    parseDataParameter(dataParam) {
        try {
            // Search for coordinates in format !2d<lon>!2d<lat>
            const coordRegex = /!2d(-?\d+\.?\d*)!2d(-?\d+\.?\d*)/g;
            const matches = [...dataParam.matchAll(coordRegex)];
            
            if (matches.length < 2) {
                return null;
            }

            // First match - origin, last - destination
            const origin = {
                lat: parseFloat(matches[0][2]),
                lon: parseFloat(matches[0][1])
            };

            const destination = {
                lat: parseFloat(matches[matches.length - 1][2]),
                lon: parseFloat(matches[matches.length - 1][1])
            };

            const result = {
                origin,
                destination,
                waypoints: []
            };

            // If there are intermediate points
            if (matches.length > 2) {
                result.waypoints = matches.slice(1, -1).map(m => ({
                    lat: parseFloat(m[2]),
                    lon: parseFloat(m[1])
                }));
            }

            return result;

        } catch (error) {
            console.error('Error parsing data parameter:', error);
            return null;
        }
    }

    /**
     * Parses a single point (coordinates or place name)
     * Formats:
     * - "54.6872,25.2797" -> { lat, lon }
     * - "Vilnius" -> { name: "Vilnius" }
     * - "Vilnius+City+Municipality" -> { name: "Vilnius City Municipality" }
     */
    parsePoint(pointString) {
        // Remove extra whitespace and decode URL encoding
        const decoded = decodeURIComponent(pointString.trim())
            .replace(/\+/g, ' ');  // replace + with spaces
        
        console.log(`Parsing point: "${pointString}" -> "${decoded}"`);

        // Try to parse as coordinates
        const coordMatch = decoded.match(/^(-?\d+\.?\d*),\s*(-?\d+\.?\d*)$/);
        
        if (coordMatch) {
            const result = {
                lat: parseFloat(coordMatch[1]),
                lon: parseFloat(coordMatch[2])
            };
            console.log('\tParsed as coordinates:', result);
            return result;
        }

        // If not coordinates then it's a place name
        const result = { name: decoded };
        console.log('\tParsed as place name:', result);
        return result;
    }

    /**
     * Checks if all points have coordinates
     * If not - geocoding is needed
     */
    needsGeocoding(parsedResult) {
        const allPoints = [
            parsedResult.origin,
            parsedResult.destination,
            ...(parsedResult.waypoints || [])
        ];

        return allPoints.some(point => point.name && !point.lat);
    }

    /**
     * Geocodes place name to coordinates via Google Geocoding API
     * Uses GOOGLE_ROUTES_API_KEY (same key for all Google APIs)
     */
    async geocodePlace(placeName) {
        const apiKey = process.env.GOOGLE_ROUTES_API_KEY || process.env.GOOGLE_MAPS_API_KEY;
        
        if (!apiKey) {
            throw new Error('Google API key not configured (GOOGLE_ROUTES_API_KEY or GOOGLE_MAPS_API_KEY)');
        }

        try {
            console.log(`Geocoding place: ${placeName}`);
            
            const response = await axios.get('https://maps.googleapis.com/maps/api/geocode/json', {
                params: {
                    address: placeName,
                    key: apiKey
                }
            });

            console.log(`Geocoding response status: ${response.data.status}`);

            if (response.data.status !== 'OK' || !response.data.results.length) {
                throw new Error(`Could not geocode place: ${placeName} (status: ${response.data.status})`);
            }

            const location = response.data.results[0].geometry.location;
            const result = {
                lat: location.lat,
                lon: location.lng
            };

            console.log(`Geocoded ${placeName} -> ${result.lat}, ${result.lon}`);
            return result;

        } catch (error) {
            console.error(`Error geocoding ${placeName}:`, error.message);
            throw error;
        }
    }

    /**
     * Handles full parsing + geocoding if needed
     */
    async parseAndGeocode(url) {
        const parsed = await this.parseGoogleMapsUrl(url);

        // Check if geocoding is needed
        if (!this.needsGeocoding(parsed)) {
            return parsed;
        }

        console.log('Some points need geocoding...');

        // Geocode origin
        if (parsed.origin.name && !parsed.origin.lat) {
            const coords = await this.geocodePlace(parsed.origin.name);
            parsed.origin = { ...coords, originalName: parsed.origin.name };
        }

        // Geocode destination
        if (parsed.destination.name && !parsed.destination.lat) {
            const coords = await this.geocodePlace(parsed.destination.name);
            parsed.destination = { ...coords, originalName: parsed.destination.name };
        }

        // Geocode waypoints
        if (parsed.waypoints && parsed.waypoints.length > 0) {
            parsed.waypoints = await Promise.all(
                parsed.waypoints.map(async (wp) => {
                    if (wp.name && !wp.lat) {
                        const coords = await this.geocodePlace(wp.name);
                        return { ...coords, originalName: wp.name };
                    }
                    return wp;
                })
            );
        }

        return parsed;
    }
}

module.exports = new GoogleMapsParser();
