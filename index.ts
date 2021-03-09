import cheerio from 'cheerio';
import got from 'got';
import { discoverGateway, TradfriClient, Accessory, AccessoryTypes } from 'node-tradfri-client';
import dotenv from 'dotenv';

dotenv.config();

const lightBulbs: { [key: string]: Accessory } = {};
enum COLORS {
    GREEN = 'a9d62b',
    RED = 'dc4b31'
}

const diamondChest: string = 'https://finance.yahoo.com/quote/GME';

const bananaPicker = (_: number, stonkElement: cheerio.Element): boolean => {
    if (stonkElement.type !== 'tag' || stonkElement.attribs['data-reactid'] == null) { return false; }
    return stonkElement.attribs['data-reactid'] === '32';
}

const findBanana = async (): Promise<number | undefined> => {
    let banana: number | null = null;
    const res = await got(diamondChest);
    const dfv = cheerio.load(res.body);
    dfv('span').filter(bananaPicker).each((_, ripeBanana) => {
        if (ripeBanana.type === 'tag' && ripeBanana.firstChild) {
            const isThisDiamondBanana = Number(ripeBanana.firstChild.data);
            const isDiamondBanana = !isNaN(isThisDiamondBanana);
            if (isDiamondBanana){
               banana = isThisDiamondBanana;
            }
        }
    });

    if (banana) {
        return banana;
    } else {
        return undefined;
    }
}

const deviceUpdated = (device: Accessory): void => {
    if (device.type === AccessoryTypes.lightbulb) {
        lightBulbs[device.instanceId] = device;
    }
}

const connectToGateway = async () => {
    const securityCode = process.env.secret;
    if (!securityCode) {
        console.error('Monkey need to gibe security secrets');
        process.exit();
    }
    const result = await discoverGateway();
    if (result) {
        try {
            const tradfri = new TradfriClient(result.name);
            const {identity, psk} = await tradfri.authenticate(securityCode);
            await tradfri.connect(identity, psk);
            tradfri.on('device updated', deviceUpdated).observeDevices();
        } catch (e) {
            console.error(e);
        }
    }
}

connectToGateway().then(() => {
    let oldStonk = 0;
    setInterval( async () => {
        const newStonk = await findBanana();
        const light = lightBulbs[65539].lightList[0];

        if (newStonk) {
            if (newStonk > oldStonk) {
                console.log('Monke like');
                light.setColor(COLORS.GREEN);
            } else if (newStonk < oldStonk){
                console.log('Monke no like');
                light.setColor(COLORS.RED);
            }

            oldStonk = newStonk;
        } else {
            console.log('Didn\'t find the banana');
        }
    }, 2000);
});
