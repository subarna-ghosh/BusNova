const { validationResult } = require("express-validator");

const validateWeb = (viewName) => {
  return (req, res, next) => {
    const result = validationResult(req);

    if (!result.isEmpty()) {
      const errors = {};

      result.array().forEach((error) => {
        if (!errors[error.path]) {
          errors[error.path] = error.msg;
        }
      });

      return res.render(viewName, {
        errors,
        old: req.body,
      });
    }

    next();
  };
};

module.exports = validateWeb;

// [
//   {
//     type: 'field',
//     value: '',
//     msg: 'Email is required',
//     path: 'email',
//     location: 'body'
//   },
//   {
//     type: 'field',
//     value: '',
//     msg: 'Invalid email',
//     path: 'email',
//     location: 'body'
//   },
//   {
//     type: 'field',
//     value: '123',
//     msg: 'Password must be at least 8 characters',
//     path: 'password',
//     location: 'body'
//   }
// ]
