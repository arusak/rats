window.onload = function () {
    'use strict';

    // settings
    var numberOfRats = 10;
    var rerouteProbability = 0.02;
    var speedChangeProbability = 0.1;
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

    // Static wall
    var wall = {
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
        },
        // Check if coordinate is inside the wall. Accepts 2 numbers or an object {x, y}
        has: function (x, y) {
            if (typeof x === 'object') {
                y = x.y;
                x = x.x;
            }

            return x >= this.x &&
                x <= this.x + this.width &&
                y >= this.y &&
                y <= this.y + this.height;
        }
    };

    // Main actor
    var rat = {
        width: 15,
        height: 15,
        direction: 'n', // we need some value to begin looking around
        speed: 3, // scalar speed

        timers: {}, // any timers go here

        // Measure coordinates change
        getVelocity: function () {
            return {
                x: (velocitySigns[this.direction]).x * this.speed,
                y: (velocitySigns[this.direction]).y * this.speed
            };
        },

        // Where our new edges will be
        getNewEdges: function () {
            return this.getEdges(this.getVelocity());
        },

        // Where our new corners will be
        getNewCorners: function () {
            return this.getCorners({x: 0, y: 0});
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
            var edges = this.getNewEdges();
            var corners = this.getNewCorners();

            // check with game borders
            var directions = {
                e: edges.e <= game.width,
                s: edges.s <= game.height,
                n: edges.n >= 0,
                w: edges.w >= 0
            };

            this.possibleDirections = [];

            // check with walls (will one of my front edges will be inside any wall?)
            game.walls.forEach(function (wall) {
                directions.e = directions.e && !wall.has(corners.ne) && !wall.has(corners.se);
                directions.s = directions.s && !wall.has(corners.se) && !wall.has(corners.sw);
                directions.n = directions.n && !wall.has(corners.ne) && !wall.has(corners.nw);
                directions.w = directions.w && !wall.has(corners.nw) && !wall.has(corners.sw);
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
            if (prob(speedChangeProbability)) {
                this.speed += (1 - rnd(2));
            }

            // calm down to speedy rat
            if (this.speed > 5) {
                this.speed -= 1;
            }
            // speed up to slow rat
            if (this.speed < 1) {
                this.speed += 1;
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

        // Render self
        draw: function () {
            ctx.fillStyle = 'rgb(255,255,255)';
            ctx.fillRect(this.x, this.y, this.width, this.height);
        },

        // Do this every tick
        update: function () {
            this.look();
            this.chooseDirection(this.direction);

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

            // make self a name
            this.name = '';
            for (i = 0; i < rnd(3) + 2; i++) {
                this.name += parts[rnd(parts.length - 1)];
            }
        }
    };

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

            for (i = 0; i < this.walls.length; i+=1) {
                if (this.walls[i].has(coord)) {
                    inside = true;
                }
            }

            return inside;
        },

        init: function () {
            var i, o;
            var coord = {};

            // make walls
            for (i = 0; i < 9; i += 1) {
                o = Object.create(wall);
                o.init(15 * (3 + 17 * (i % 3)), 15 * (3 + 12 * (Math.floor(i / 3))), 15 * 14, 15 * 9);
                this.walls.push(o);
            }

            // grow some rats
            for (i = 0; i < numberOfRats; i += 1) {
                o = Object.create(rat);
                this.objects.push(o);
                this.rats.push(o);

                // generate random coordinate until we find one that does not belong to a wall
                do {
                    coord = {
                        x: rnd(game.width - rat.width),
                        y: rnd(game.height - rat.height)
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

    game.init();
    tick();

};