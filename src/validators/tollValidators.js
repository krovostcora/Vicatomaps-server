// validators/tollValidators.js
const Joi = require('joi');

const calculateTollsSchema = Joi.object({
    route: Joi.array()
        .items(
            Joi.object({
                lat: Joi.number().min(-90).max(90).required(),
                lng: Joi.number().min(-180).max(180).required()
            })
        )
        .min(2)
        .required()
        .messages({
            'array.min': 'Route must have at least 2 points',
            'any.required': 'Route is required'
        }),

    vehicleType: Joi.string()
        .valid('2AxlesAuto', '3AxlesAuto', '4AxlesAuto', 'Motorcycle', 'Bus')
        .default('2AxlesAuto')
});

// middlewares/requestValidator.js
function validate(schema) {
    return (req, res, next) => {
        const { error, value } = schema.validate(req.body, {
            abortEarly: false,
            stripUnknown: true
        });

        if (error) {
            const errors = error.details.map(detail => ({
                field: detail.path.join('.'),
                message: detail.message
            }));

            return next(new ValidationError('Validation failed', errors));
        }

        req.validatedBody = value;
        next();
    };
}