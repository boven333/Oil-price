const soap = require('soap');
const axios = require('axios');
const xml2js = require('xml2js');

// ตั้งค่า Access Token ของ Line Notify ที่ได้รับมา
const LINE_NOTIFY_TOKEN = process.env.LINE_NOTIFY_TOKEN;

// ฟังก์ชันสำหรับส่งข้อความแจ้งเตือน
const sendLineNotify = async (message) => {
    const url = 'https://notify-api.line.me/api/notify';
    const headers = {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Authorization': `Bearer ${LINE_NOTIFY_TOKEN}`
    };
    const data = `message=${message}`;

    try {
        const response = await axios.post(url, data, { headers });
        console.log('Notification sent:', response.data);
    } catch (error) {
        console.error('Error sending notification:', error);
    }
};

// ฟังก์ชันสำหรับดึงข้อมูลราคาน้ำมันจาก SOAP API
const getOilPrice = async () => {
    const wsdlUrl = 'https://orapiweb.pttor.com/oilservice/OilPrice.asmx?WSDL';
    
    soap.createClient(wsdlUrl, (err, client) => {
        if (err) {
            console.error('Error creating SOAP client:', err);
            return;
        }

        // เรียกใช้ฟังก์ชัน GetOilPrice (ปรับวัน/เดือน/ปี ตามต้องการ)
        const args = { Language: 'en', DD: new Date().getDate(), MM: new Date().getMonth() + 1, YYYY: new Date().getFullYear() };
        client.GetOilPrice(args, (err, result) => {
            if (err) {
                console.error('Error calling SOAP method:', err);
                return;
            }

            const xml = result.GetOilPriceResult;
            xml2js.parseString(xml, (err, jsonResult) => {
                if (err) {
                    console.error('Error parsing XML:', err);
                    return;
                }

                const fuels = jsonResult.PTTOR_DS.FUEL;
                console.log("OIL JSON", fuels);

                // สมมุติว่าทุก `FUEL` มี `PRICE_DATE` เดียวกัน
                let priceDate = fuels[0].PRICE_DATE[0];
                let message = `ราคาน้ำมันใน กรุงเทพ +- ~1.7 นครราชสีมา ประจำวันที่ ${priceDate}:\n`;
                
                fuels.forEach(fuel => {
                    message += `${fuel.PRODUCT[0]}: ${fuel.PRICE[0]} บาท\n`;
                });

                sendLineNotify(message);
            });
        });
    });
};

// ฟังก์ชันหลัก
(async () => {
    await getOilPrice();
})();
