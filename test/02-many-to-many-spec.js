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
const { Musician, Band, Instrument, MusicianInstrument} = require('../server/db/models');

describe('Many-to-Many Specs', () => {

    before(async () => {
        await resetDB(DB_TEST_FILE);
        return await seedAllDB(DB_TEST_FILE);
    });

      after(async () => {
        return await removeTestDB(DB_TEST_FILE);
    });

    describe('Musician to Instrument relationship', () => {
        let marine;
        let america;
        let georgette;
        let adam;
        let anton;

        before(async () => {
            // Create Marine Sweet, member of America The Piano
            marine = Musician.build({firstName: 'Marine', lastName: 'Sweet'});
            america = await Band.findOne({where: {name: 'America The Piano'}});
            marine.bandId = america.id;
            await marine.save();

            // Create Georgette Kubo, member of America The Piano
            georgette = Musician.build({firstName: 'Georgette', lastName: 'Kubo'});
            georgette.bandId = america.id;
            await georgette.save();

            adam = Musician.build({firstName: 'Adam', lastName: 'Appleby'});
            adam.bandId = america.id;
            await adam.save();

            // Create Anton Martinovic, member of The Falling Box
            anton = Musician.build({firstName: 'Anton', lastName: 'Martinovic'});
            anton.bandId = america.id;
            await anton.save();
        });

        it('can properly associate musicians with instruments', async () => {
            const beforeMarine = await marine.getInstruments()

            expect(beforeMarine).to.be.an('array');
            expect(beforeMarine).to.have.length(0);

            // Associate Marine with saxophone
            await marine.addInstruments(await Instrument.findAll({
                where: {type: ['saxophone']}
            }));

            const afterMarine = await marine.getInstruments()

            expect(afterMarine).to.be.an('array');
            expect(afterMarine).to.have.length(1);
            expect(afterMarine[0].dataValues.id).to.equal(8);
            expect(afterMarine[0].dataValues.type).to.equal("saxophone");

            const beforeGeorgette = await georgette.getInstruments()

            expect(beforeGeorgette).to.be.an('array');
            expect(beforeGeorgette).to.have.length(0);

            // Associate Georgette with drums, trumpet, and saxophone
            await georgette.addInstruments(await Instrument.findAll({
                where: {type: ['drums', 'trumpet', 'saxophone']}
            }));


            const afterGeorgette = await georgette.getInstruments()

            expect(afterGeorgette).to.be.an('array');
            expect(afterGeorgette).to.have.length(3);
            expect(afterGeorgette[0].dataValues.id).to.equal(3);
            expect(afterGeorgette[0].dataValues.type).to.equal("drums");
            expect(afterGeorgette[1].dataValues.id).to.equal(8);
            expect(afterGeorgette[1].dataValues.type).to.equal("saxophone");
            expect(afterGeorgette[2].dataValues.id).to.equal(7);
            expect(afterGeorgette[2].dataValues.type).to.equal("trumpet");
        });


        it('can properly associate instruments with musicians', async () => {
            let cello = await Instrument.findOne({where: {type: 'cello'}})
            let beforeCelloists = await cello.getMusicians();

            expect(beforeCelloists).to.be.an('array');
            expect(beforeCelloists).to.have.length(0);

            await cello.addMusicians([adam, anton])
            let afterCelloists = await cello.getMusicians();

            expect(afterCelloists).to.be.an('array');
            expect(afterCelloists).to.have.length(2);
            expect(afterCelloists[0].dataValues.id).to.equal(3);
            expect(afterCelloists[0].dataValues.firstName).to.equal("Adam");
            expect(afterCelloists[1].dataValues.id).to.equal(4);
            expect(afterCelloists[1].dataValues.firstName).to.equal("Anton");
        });


        it('can select all musicians associated with an instrument', async () => {
            let saxophone = await Instrument.findOne({where: {type: 'saxophone'}})
            let saxophonists = await saxophone.getMusicians({
              attributes: ['id', 'firstName', 'lastName'],
              order: [['firstName']],
              includeIgnoreAttributes: false
            });

            expect(saxophonists).to.have.length(2);
            expect(saxophonists[0].dataValues.id).to.equal(georgette.id);
            expect(saxophonists[0].dataValues.firstName).to.equal("Georgette");
            expect(saxophonists[1].dataValues.id).to.equal(marine.id);
            expect(saxophonists[1].dataValues.firstName).to.equal("Marine");
        });

        it('can select all instruments associated with a musician', async () => {
            let georgetteInst = await georgette.getInstruments({
                attributes: ['id', 'type'],
                order: [['type']],
                includeIgnoreAttributes: false
            });

            expect(georgetteInst).to.have.length(3);
            expect(georgetteInst[0].dataValues.id).to.equal(3);
            expect(georgetteInst[0].dataValues.type).to.equal("drums");

            expect(georgetteInst[1].dataValues.id).to.equal(8);
            expect(georgetteInst[1].dataValues.type).to.equal("saxophone");

            expect(georgetteInst[2].dataValues.id).to.equal(7);
            expect(georgetteInst[2].dataValues.type).to.equal("trumpet");
        });

        it('association creates new record in MusicianInstruments join table', async () => {
            let allMusicianInstruments = await MusicianInstrument.findAll();
            expect(allMusicianInstruments).to.have.length(6);

            // Associate Marine with trumpet
            await marine.addInstruments(await Instrument.findAll({
                where: {type: ['trumpet']}
            }));

            allMusicianInstruments = await MusicianInstrument.findAll();
            expect(allMusicianInstruments).to.have.length(7);
        });
    });
});