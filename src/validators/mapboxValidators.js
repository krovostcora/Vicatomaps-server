// src/validators/mapboxValidators.js
const Joi = require('joi');

/**
 * Схема для координат
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
 * POST /api/geocode
 */
const geocodeSchema = Joi.object({
    query: Joi.string()
        .min(1)
        .max(500)
        .required()
        .trim()
        .messages({
            'string.empty': 'Query cannot be empty',
            'string.min': 'Query must be at least 1 character',
            'string.max': 'Query cannot exceed 500 characters',
            'any.required': 'Query is required'
        })
});

/**
 * POST /api/route
 */
const calculateRouteSchema = Joi.object({
    start: coordinateSchema.required().messages({
        'any.required': 'Start coordinates are required'
    }),

    end: coordinateSchema.required().messages({
        'any.required': 'End coordinates are required'
    })
});

module.exports = {
    geocodeSchema,
    calculateRouteSchema
};