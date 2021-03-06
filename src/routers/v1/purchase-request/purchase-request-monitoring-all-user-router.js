var Router = require('restify-router').Router;
var db = require("../../../db");
var PurchaseRequestManager = require("dl-module").managers.garmentPurchasing.PurchaseRequestManager;
var resultFormatter = require("../../../result-formatter");
var passport = require('../../../passports/jwt-passport');
const apiVersion = '1.0.0';

function getRouter() {
    var router = new Router();

    router.get('/', passport, (request, response, next) => {
        db.get().then(db => {
            var manager = new PurchaseRequestManager(db, request.user);

            var PRNo = request.params.PRNo;
            var unitId = request.params.unitId;
            var categoryId = request.params.categoryId;
            var buyerId = request.params.buyerId;
            var dateFrom = request.params.dateFrom;
            var dateTo = request.params.dateTo;
            var state = parseInt(request.params.state);
            var offset = request.headers["x-timezone-offset"] ? Number(request.headers["x-timezone-offset"]) : 0;

            manager.getDataPRMonitoring(unitId, categoryId,buyerId, PRNo, dateFrom, dateTo, state, offset)
                .then(docs => {
                    if ((request.headers.accept || '').toString().indexOf("application/xls") < 0) {
                        var result = resultFormatter.ok(apiVersion, 200, docs);
                        response.send(200, result);
                    } else {

                        var dateFormat = "DD/MM/YYYY";
                        // var dateFormat = "DD MMMM YYYY";
                        var locale = 'id-ID';
                        var moment = require('moment');
                        moment.locale(locale);

                        var data = [];
                        var index = 0;
                        for (var purchaseRequest of docs) {
                                index++;
                                var status = purchaseRequest.status ? purchaseRequest.status.label : "-";

                                if (purchaseRequest.status.value === 4 || purchaseRequest.status.value === 9) {
                                    status = purchaseRequest.deliveryOrderNos.length > 0 ? `${status} (${purchaseRequest.deliveryOrderNos.join(", ")})` : status;
                                }
                                var _item = {
                                    "No": index,
                                    "Unit": `${purchaseRequest.division} - ${purchaseRequest.unit}`,
                                    "Kategori": purchaseRequest.category,
                                    "Tanggal PR": moment(new Date(purchaseRequest.prDate)).add(offset, 'h').format(dateFormat),
                                    "Tanggal Shipment": moment(new Date(purchaseRequest.shipmentDate)).add(offset, 'h').format(dateFormat),
                                    "Nomor RO": purchaseRequest.roNo,
                                    "Buyer": purchaseRequest.buyer,
                                    "Artikel": purchaseRequest.artikel,
                                    "Nomor PR": purchaseRequest.prNo,
                                    "Nomor Referensi PR": purchaseRequest.refNo,
                                    "Kode Barang": purchaseRequest.productCode,
                                    "Nama Barang": purchaseRequest.productName,
                                    "Jumlah": purchaseRequest.productQty,
                                    "Satuan": purchaseRequest.productUom,
                                    //"Tanggal Diminta Datang": purchaseRequest.expectedDeliveryDate ? moment(new Date(purchaseRequest.expectedDeliveryDate)).add(offset, 'h').format(dateFormat) : "-",
                                    "Keterangan": purchaseRequest.remark,
                                    "Status": status
                                }
                                data.push(_item);
                            
                        }

                        var options = {
                            "No": "number",
                            "Unit": "string",
                            "Kategori": "string",
                            "Tanggal PR": "string",
                            "Tanggal Shipment": "string",
                            "Nomor RO": "string",
                            "Buyer": "string",
                            "Artikel": "string",
                            "Nomor PR": "string",
                            "Kode Barang": "string",
                            "Nama Barang": "string",
                            "Jumlah": "number",
                            "Satuan": "string",
                            //"Tanggal Diminta Datang": "string",
                            "Keterangan":"string",
                            "Status": "string",
                        };
                        response.xls(`Monitoring Garment Purchase Request - ${moment(new Date()).format(dateFormat)}.xlsx`, data, options);

                    }
                })
                .catch(e => {
                    var error = resultFormatter.fail(apiVersion, 400, e);
                    response.send(400, error);
                })
        })
    });
    return router;

}

module.exports = getRouter;