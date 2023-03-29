/* ---------------- This section must be at the top: ---------------- */
delete require.cache[require.resolve('../server/config/database.js')];
delete require.cache[require.resolve('../server/db/models')];
delete require.cache[require.resolve('../server/app')];
const path = require('path');
const DB_TEST_FILE = 'db/' + path.basename(__filename, '.js') + '.db';
process.env.DB_TEST_FILE = 'server/' + DB_TEST_FILE;
/* ------------------------------------------------------------------ */

const chai = require('chai');
const chaiAsPromised = require("chai-as-promised");
chai.use(chaiAsPromised);
const expect = chai.expect;

const { resetDB, seedAllDB, removeTestDB } = require('./utils/test-utils');
const { Musician, Band } = require('../server/db/models');

describe('One-to-Many Specs', () => {

    before(async () => {
        await resetDB(DB_TEST_FILE);
        return await seedAllDB(DB_TEST_FILE);
    });

    after(async () => {
        return await removeTestDB(DB_TEST_FILE);
    });

    describe('Musician -> Band relationship', () => {
        let adam;
        let fallingBox;

        before(async () => {
            adam = await Musician.build({firstName: 'Adam', lastName: 'Appleby'});
            fallingBox = await Band.findOne({where: {name: 'The Falling Box'}});
            adam.bandId = fallingBox.id;
            await adam.save();
        })

        it('implements the correct association from Musician to Band', async () => {
            const res = await Musician.findByPk(adam.id, {include: Band});
            const queryResult = res.toJSON();

            expect(queryResult).to.not.be.null;
            expect(queryResult).to.be.an('object');
            expect(queryResult.id).to.equal(adam.id);
            expect(queryResult.bandId).to.equal(fallingBox.id);

            expect(queryResult).to.have.own.property("Band");
            expect(queryResult.Band.id).to.equal(queryResult.bandId);
        });

        it('the foreign key reference is the only band info in the musician record', async () => {
            const res = await Musician.findByPk(adam.id);
            const queryResult = res.toJSON();

            expect(queryResult).to.not.be.null;
            expect(queryResult).to.be.an('object');
            expect(queryResult.id).to.equal(adam.id);
            expect(queryResult.bandId).to.equal(fallingBox.id);

            expect(queryResult).to.not.have.own.property("Band");
            expect(Object.values(queryResult)).to.not.include("The Falling Box");
        });

        it('deleting the band deletes the musicians associated with it', async () => {
            await fallingBox.destroy();

            const band = await Band.findByPk(fallingBox.id);
            expect(band).to.be.null;

            const musician = await Musician.findByPk(adam.id);
            expect(musician).to.be.null;

            const musicians = await Musician.findAll();
            expect(musicians).to.be.an('array');
            expect(musicians).to.be.empty;
        });
    });
});