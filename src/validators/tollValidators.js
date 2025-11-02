// src/validators/tollValidators.js
const Joi = require('joi');

/**
 * Схема для координати
 */
const coordinateSchema = Joi.object({
    lat: Joi.number()
        .min(-90)
        .max(90)
        .required()
        .messages({
            'number.min': 'Latitude must be between -90 and 90',
            'number.max': 'Latitude must be between -90 and 90',
            'any.required': 'Latitude is required'
        }),

    lng: Joi.number()
        .min(-180)
        .max(180)
        .required()
        .messages({
            'number.min': 'Longitude must be between -180 and 180',
            'number.max': 'Longitude must be between -180 and 180',
            'any.required': 'Longitude is required'
        })
});

/**
 * POST /api/tolls/calculate
 */
const calculateTollsSchema = Joi.object({
    route: Joi.array()
        .items(coordinateSchema)
        .min(2)
        .required()
        .messages({
            'array.min': 'Route must have at least 2 points',
            'any.required': 'Route is required'
        }),

    vehicleType: Joi.string()
        .valid('2AxlesAuto', '3AxlesAuto', '4AxlesAuto', 'Motorcycle', 'Bus')
        .default('2AxlesAuto')
        .messages({
            'any.only': 'Invalid vehicle type'
        })
});

/**
 * POST /api/tolls/estimate
 */
const estimateTollsSchema = calculateTollsSchema; // Той самий формат

/**
 * GET /api/tolls/country/:countryCode
 */
const getTollsByCountrySchema = Joi.object({
    params: Joi.object({
        countryCode: Joi.string()
            .length(2)
            .uppercase()
            .required()
            .messages({
                'string.length': 'Country code must be 2 characters',
                'any.required': 'Country code is required'
            })
    }),

    query: Joi.object({
        roadType: Joi.string()
            .valid('highway', 'expressway', 'bridge', 'tunnel', 'vignette')
            .optional(),

        active: Joi.boolean()
            .default(true)
            .optional()
    })
});

module.exports = {
    calculateTollsSchema,
    estimateTollsSchema,
    getTollsByCountrySchema
};