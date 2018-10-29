const Koa = require('koa');
const Router = require('koa-router');
const bodyParser = require('koa-bodyparser');

const passport = require('koa-passport');
const LocalStrategy = require('passport-local');
const JwtStrategy = require('passport-jwt').Strategy;
const ExtractJwt = require('passport-jwt').ExtractJwt;

const app = new Koa();
const router = new Router();

app.use(passport.initialize());
app.use(router.routes());
const server = app.listen(3000);

const jwtsecret = "mysecretkey";
const jwt = require('jsonwebtoken');

const mysql2 = require('mysql2');
const Sequelize = require('sequelize');
const sequelize = new Sequelize('office', 'root', 'blacklabelk32', {
	host: 'localhost',
	dialect: 'mysql',
});

sequelize
	.authenticate()
	.then(() => {
		console.log('Connection has been established successfully.');
	})
	.catch(err => {
		console.error('Unable to connect to the database:', err);
	});

const User = sequelize.define('users', {
	annotation_id: {
		type: Sequelize.INTEGER,
		autoIncrement: true,
		primaryKey: true
	},
	email: {
		type: Sequelize.STRING,
	},
	password: {
		type: Sequelize.STRING,
	},
}, {
		freezeTableName: true,
	});

passport.use('local', new LocalStrategy({
	usernameField: 'email',
	passwordField: 'password',
	session: false
},
	function (req, email, password, done) {
		User.findOne({ where: { email: email } }).then(function (user) {
			if (user) {
				return done(null, user)
			}
		})
	}
));

const jwtOptions = {
	jwtFromRequest: ExtractJwt.fromAuthHeader(),
	secretOrKey: jwtsecret
};

passport.use('jwt', new JwtStrategy(jwtOptions, function (payload, done) {
	User.findById(payload.id, (err, user) => {
		if (err) {
			return done(err)
		}
		if (user) {
			done(null, user)
		} else {
			done(null, false)
		}
	})
})
);

router.post('/login', async (ctx, next) => {
	await passport.authenticate('local', function (err, user) {
		if (user == false) {
			ctx.body = "Login failed";
		} else {
			//--payload
			const payload = {
				id: user.annotation_id,
				email: user.email
			};
			const token = jwt.sign(payload, jwtsecret); //here is created JWT

			ctx.body = { payload: payload, token: 'JWT ' + token };
		}
	})(ctx, next);
});