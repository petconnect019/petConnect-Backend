let counter = 0;

module.exports = {
  setCounter: function(context, events, done) {
    counter++;
    // Asignar el valor del contador al entorno
    context.vars.COUNTER = counter;
    return done();
  },
  
  getRandomInt: function(min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
  }
}; 