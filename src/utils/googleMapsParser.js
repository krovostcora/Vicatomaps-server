// src/utils/googleMapsParser.js
const axios = require('axios');

class GoogleMapsParser {
    /**
     * Парсить Google Maps URL і витягує origin, destination, waypoints
     * Підтримує формати:
     * - Short URLs: https://maps.app.goo.gl/xxx
     * - Full URLs: https://www.google.com/maps/dir/54.6872,25.2797/54.8978,23.9094/
     * - URLs з місцями: https://www.google.com/maps/dir/Vilnius/Kaunas/
     */
    async parseGoogleMapsUrl(url) {
        try {
            console.log('Parsing Google Maps URL:', url);

            // Очистити URL від зайвих параметрів (g_st, g_ep тощо)
            let cleanUrl = url.split('?')[0]; // Видалити все після ?
            console.log('Cleaned URL:', cleanUrl);

            // Якщо це short URL - розгорнути його
            let fullUrl = cleanUrl;
            if (cleanUrl.includes('maps.app.goo.gl') || cleanUrl.includes('goo.gl')) {
                fullUrl = await this.expandShortUrl(cleanUrl);
                console.log('Expanded URL:', fullUrl);
            }

            // Парсити повний URL
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
     * Розгортає short URL в повний через HTTP redirect
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
            // Якщо axios автоматично перейшов за редіректом
            if (error.response && error.response.request) {
                const finalUrl = error.response.request.res.responseUrl;
                if (finalUrl) return finalUrl;
            }

            // Альтернативний спосіб - просто робимо запит і дивимось куди перенаправило
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
     * Парсить повний Google Maps URL
     * Приклади форматів:
     * - /dir/54.6872,25.2797/54.8978,23.9094/
     * - /dir/Vilnius/Kaunas/
     * - /dir/Ljubljana,+Slovenia/Lviv,+Ukraine/@47.9,13.9,6z/data=...
     */
    parseFullUrl(url) {
        try {
            const urlObj = new URL(url);
            const pathname = urlObj.pathname;
            const searchParams = urlObj.searchParams;

            console.log('Parsing pathname:', pathname);
            console.log('Has data param:', searchParams.has('data') || pathname.includes('/data='));

            // Спробуємо спочатку витягти координати з data параметру
            const dataMatch = url.match(/data=([^&]+)/);
            if (dataMatch) {
                try {
                    const coordinates = this.parseDataParameter(dataMatch[1]);
                    if (coordinates) {
                        console.log('✅ Parsed from data parameter:', coordinates);
                        return coordinates;
                    }
                } catch (e) {
                    console.log('Failed to parse data parameter, falling back to path parsing');
                }
            }

            // Fallback: парсинг з pathname
            // Шукаємо /dir/ в URL
            const dirMatch = pathname.match(/\/dir\/([^/]+)(?:\/([^/?]+))?(?:\/([^/@?]+))?/);
            
            if (!dirMatch) {
                throw new Error('Invalid Google Maps directions URL format');
            }

            let points = [dirMatch[1], dirMatch[2], dirMatch[3]]
                .filter(Boolean)
                .filter(p => {
                    // Фільтруємо viewport/zoom параметри (починаються з @)
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

            // Якщо є проміжні точки (waypoints)
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
     * Парсить data= параметр з Google Maps URL
     * Витягує координати з encoded data
     */
    parseDataParameter(dataParam) {
        try {
            // Шукаємо координати в форматі !2d<lon>!2d<lat>
            const coordRegex = /!2d(-?\d+\.?\d*)!2d(-?\d+\.?\d*)/g;
            const matches = [...dataParam.matchAll(coordRegex)];
            
            if (matches.length < 2) {
                return null;
            }

            // Перший матч - origin, останній - destination
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

            // Якщо є проміжні точки
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
     * Парсить одну точку (координати або назву місця)
     * Формати:
     * - "54.6872,25.2797" -> { lat, lon }
     * - "Vilnius" -> { name: "Vilnius" } (потрібно буде геокодувати)
     */
    parsePoint(pointString) {
        // Видалити зайві пробіли та decode URL encoding
        const decoded = decodeURIComponent(pointString.trim());
        
        // Спроба розпарсити як координати
        const coordMatch = decoded.match(/^(-?\d+\.?\d*),\s*(-?\d+\.?\d*)$/);
        
        if (coordMatch) {
            return {
                lat: parseFloat(coordMatch[1]),
                lon: parseFloat(coordMatch[2])
            };
        }

        // Якщо це не координати - це назва місця
        return {
            name: decoded
        };
    }

    /**
     * Перевіряє чи всі точки мають координати
     * Якщо ні - потрібно геокодувати
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
     * Геокодує назву місця в координати через Google Geocoding API
     * Використовує GOOGLE_ROUTES_API_KEY (той самий ключ для всіх Google APIs)
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

            console.log(`✅ Geocoded ${placeName} -> ${result.lat}, ${result.lon}`);
            return result;

        } catch (error) {
            console.error(`Error geocoding ${placeName}:`, error.message);
            throw error;
        }
    }

    /**
     * Обробляє весь парсинг + геокодування якщо потрібно
     */
    async parseAndGeocode(url) {
        const parsed = await this.parseGoogleMapsUrl(url);

        // Перевірити чи потрібно геокодувати
        if (!this.needsGeocoding(parsed)) {
            return parsed;
        }

        console.log('Some points need geocoding...');

        // Геокодувати origin
        if (parsed.origin.name && !parsed.origin.lat) {
            const coords = await this.geocodePlace(parsed.origin.name);
            parsed.origin = { ...coords, originalName: parsed.origin.name };
        }

        // Геокодувати destination
        if (parsed.destination.name && !parsed.destination.lat) {
            const coords = await this.geocodePlace(parsed.destination.name);
            parsed.destination = { ...coords, originalName: parsed.destination.name };
        }

        // Геокодувати waypoints
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
