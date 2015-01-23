/* global _ */
window.onload = function () {
    'use strict';

    // settings
    var numberOfRats = 10;
    var baseSpeed = 2;
    var cellSize = baseSpeed * 8;
    var rerouteProbability = 0.02;
    var speedChangeProbability = 0;
    var sleepProbability = 0.005; // happens on average every 200 ticks

    var canvas = document.getElementById('canvas');
    var ctx = canvas.getContext('2d');

    // velocity sign for each direction
    var velocitySigns = {
        n: {x: 0, y: -1},
        e: {x: +1, y: 0},
        s: {x: 0, y: +1},
        w: {x: -1, y: 0}
    };

    var Actor = {
        // Check if coordinate is inside the actor. Accepts 2 numbers or a tuple {x, y}
        has: function () {
            var self = this;
            var o;

            // Check if a coordinate is within actor
            function simple(x, y) {
                return x > self.x &&
                    x < self.x + self.width &&
                    y > self.y &&
                    y < self.y + self.height;
            }

            if (typeof arguments[0] === 'number' && typeof arguments[1] === 'number') {
                // just a pair of coordinates
                return simple(arguments[0], arguments[1].y);
            }

            if (typeof arguments[0] === 'object') {
                o = arguments[0];

                // object with coordinates
                if (o.x !== undefined && o.y !== undefined) {
                    return simple(o.x, o.y);
                }

                // corners
                if (o.nw !== undefined) {
                    return simple(o.nw.x, o.nw.y) ||
                        simple(o.sw.x, o.sw.y) ||
                        simple(o.ne.x, o.ne.y) ||
                        simple(o.se.x, o.se.y);
                }
            }

        }
    };

    // Static wall
    var Wall = _.extend({}, Actor, {
        update: function () {
        },
        // Render self
        draw: function () {
            ctx.fillStyle = '#000';
            ctx.strokeStyle = '#fff';
            ctx.lineWidth = 1;
            ctx.fillRect(this.x, this.y, this.width, this.height);
            ctx.strokeRect(this.x, this.y, this.width, this.height);
        },
        // Set object position and size
        init: function (x, y, width, height) {
            this.x = x;
            this.y = y;
            this.width = width;
            this.height = height;
        }
    });

    // Main actor
    var Rat = _.extend({}, Actor, {
        id: 0, // initial id

        width: cellSize,
        height: cellSize,
        direction: 'n', // we need some value to begin looking around
        speed: baseSpeed, // scalar speed

        timers: {}, // any timers go here
        meeting: {}, // the rats we are meeting

        // Measure coordinates change
        getVelocity: function () {
            return makeVelocity(this.direction, this.speed);
        },

        // Where our new edges will be if we go in stated direction with speed
        getNewEdges: function (direction, speed) {
            return this.getEdges(makeVelocity(direction, speed));
        },

        // Where our new corners will be if we go in stated direction with speed
        getNewCorners: function (direction, speed) {
            return this.getCorners(makeVelocity(direction, speed));
        },

        // Where our corners are
        getCorners: function (velocity) {
            var edges = this.getEdges(velocity);

            return {
                nw: {x: edges.w, y: edges.n},
                ne: {x: edges.e, y: edges.n},
                sw: {x: edges.w, y: edges.s},
                se: {x: edges.e, y: edges.s}
            };
        },

        // Where our edges are
        getEdges: function (velocity) {
            if (!velocity) {
                velocity = {x: 0, y: 0};
            }

            return {
                e: this.x + this.width + velocity.x,
                s: this.y + this.height + velocity.y,
                n: this.y + velocity.y,
                w: this.x + velocity.x
            };
        },

        // Have a look around and see which directions are available
        look: function () {
            var self = this;

            // check with game borders
            var directions = {
                e: this.getNewEdges('e', this.speed).e <= game.width,
                s: this.getNewEdges('s', this.speed).s <= game.height,
                n: this.getNewEdges('n', this.speed).n >= 0,
                w: this.getNewEdges('w', this.speed).w >= 0
            };

            this.possibleDirections = [];

            // check with walls (will one of my front edges will be inside any wall?)
            game.walls.forEach(function (wall) {
                directions.e = directions.e && !wall.has(self.getNewCorners('e', self.speed).ne) && !wall.has(self.getNewCorners('e', self.speed).se);
                directions.s = directions.s && !wall.has(self.getNewCorners('s', self.speed).se) && !wall.has(self.getNewCorners('s', self.speed).sw);
                directions.n = directions.n && !wall.has(self.getNewCorners('n', self.speed).ne) && !wall.has(self.getNewCorners('n', self.speed).nw);
                directions.w = directions.w && !wall.has(self.getNewCorners('w', self.speed).nw) && !wall.has(self.getNewCorners('w', self.speed).sw);
            });

            // make an array of possible directions
            Object.keys(directions).forEach(function (direction) {
                if (directions[direction]) {
                    self.possibleDirections.push(direction);
                }
            });
        },

        /**
         * Choose movement direction.
         * If has parameter, tends to keep it. Yet has a small chance to change direction.
         * If no parameter is given, choose randomly.
         *
         * @param [direction] previous direction.
         */
        chooseDirection: function (direction) {
            // no argument or argument is impossible or chance
            if (!direction || this.possibleDirections.indexOf(direction) < 0 || prob(rerouteProbability)) {
                this.direction = this.possibleDirections[rnd(this.possibleDirections.length - 1)];
                //this.say('heading ' + this.direction + ', possible: ' + this.possibleDirections);
            } else {
                this.direction = direction;
            }

            if (!this.direction) {
                this.say('Could not find any direction');
            }
        },

        /**
         * Move in defined direction with variable speed
         */
        move: function () {
            var v;

            // speed fluctuates
            if (this.x % cellSize === 0 && prob(speedChangeProbability)) {
                if (this.speed === baseSpeed) {
                    if (prob(0.5)) {
                        this.speed = baseSpeed / 2;
                    } else {
                        this.speed = baseSpeed * 2;
                    }
                } else {
                    this.speed = baseSpeed;
                }
            }

            v = this.getVelocity();

            // actual moving
            this.x += v.x;
            this.y += v.y;
        },

        // Write a string into console
        say: function (what) {
            window.console.log(this.name + ' says: ' + what);
        },

        // Sleep for a number of ticks
        sleep: function (time) {
            this.timers.sleep = time;
            this.sleeping = true;
        },

        // Stop sleeping
        wake: function () {
            this.sleeping = false;
        },

        meet: function () {
            var i;
            var otherRat;

            for (i = 0; i < game.rats.length; i += 1) {
                if (game.rats[i] !== this) {
                    otherRat = game.rats[i];
                    if (this.has(otherRat.getCorners())) {
                        if (!this.meeting[otherRat.id]) {
                            this.meeting[otherRat.id] = true;
                            //this.say('hello ' + otherRat.name);
                        }
                    } else {
                        this.meeting[otherRat.id] = false;
                    }
                }
            }
        },

        // Render self
        draw: function () {
            ctx.fillStyle = this.color;
            ctx.fillRect(this.x, this.y, this.width, this.height);
        },

        // Do this every tick
        update: function () {
            this.look();
            this.meet();
            if (this.x % cellSize === 0 && this.y % cellSize === 0) {
                this.chooseDirection(this.direction);
            }

            if (!this.sleeping) {
                // if me don't sleep, me move
                this.move();
                // but sometimes me may fall asleep
                if (prob(sleepProbability)) {
                    this.sleep(rnd(100) + 10);
                }
            } else {
                // if sleep timer exist, check it
                if (this.timers.sleep > 0) {
                    this.timers.sleep -= 1;
                } else {
                    this.wake();
                }
            }
        },

        init: function (x, y) {
            var i;
            var parts = 'pa,ma,ra,ta,ka,sa,la,va,na,ba,ra'.split(',');

            this.x = x;
            this.y = y;

            this.id = Rat.id;
            Rat.id += 1;

            // make self a name
            this.name = '';
            for (i = 0; i < rnd(3) + 2; i++) {
                this.name += parts[rnd(parts.length - 1)];
            }

            this.gender = prob(0.5) ? 'MALE' : 'FEMALE';
            this.color = this.gender === 'MALE' ? '#69f' : '#f99';

        }
    });

    var game = {
        width: canvas.width,
        height: canvas.height,

        objects: [],
        rats: [],
        walls: [],

        draw: function () {
            ctx.clearRect(0, 0, canvas.width, canvas.height);

            for (var i = 0; i < this.objects.length; i++) {
                this.objects[i].draw();
            }
        },

        update: function () {
            for (var i = 0; i < this.objects.length; i++) {
                this.objects[i].update();
            }

        },

        // check if any wall contains the coordinate
        insideWall: function (coord) {
            var i, inside = false;

            for (i = 0; i < this.walls.length; i += 1) {
                if (this.walls[i].has(coord)) {
                    inside = true;
                }
            }

            return inside;
        },

        init: function () {
            var i, o;
            var coord = {};
            var wallWidth = 7;
            var wallHeight = 7;
            var wallGap = 1;
            var numberOfRows = Math.floor(game.height / ((wallHeight + wallGap) * cellSize));
            var numberOfCols = Math.floor(game.width / ((wallWidth + wallGap) * cellSize));

            // make walls
            for (i = 0; i < numberOfRows * numberOfCols; i += 1) {
                o = Object.create(Wall);
                o.init(
                    cellSize * (wallGap + (wallWidth + wallGap) * (i % numberOfCols)),
                    cellSize * (wallGap + (wallHeight + wallGap) * Math.floor(i / numberOfCols)),
                    cellSize * wallWidth,
                    cellSize * wallHeight);
                this.walls.push(o);
            }

            // grow some rats
            for (i = 0; i < numberOfRats; i += 1) {
                o = Object.create(Rat);
                this.objects.push(o);
                this.rats.push(o);

                // generate random coordinate until we find one that does not belong to a wall
                do {
                    coord = {
                        x: rnd(Math.floor(game.width / cellSize) - 1) * cellSize,
                        y: rnd(Math.floor(game.height / cellSize) - 1) * cellSize
                    };
                } while (this.insideWall(coord));

                o.init(coord.x, coord.y);
            }

            this.objects = this.walls.concat(this.rats);
        }
    };

    /**
     * Main loop
     */
    function tick() {
        game.draw();
        game.update();
        requestAnimationFrame(tick);
    }

    /**
     * Returns a random integer from [0..n]
     * @param n
     * @returns {number}
     */
    function rnd(n) {
        return Math.floor(Math.random() * (n + 1));
    }

    /**
     * Returns true with probability of p. Otherwise, returns false
     * @param p
     * @returns {boolean}
     */
    function prob(p) {
        return Math.random() < p;
    }

    function makeVelocity(direction, speed) {
        return {
            x: (velocitySigns[direction]).x * speed,
            y: (velocitySigns[direction]).y * speed
        };
    }

    game.init();
    tick();

};