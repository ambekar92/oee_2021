var ExcelJS = require('exceljs');
const XlsxPopulate = require('xlsx-populate');
const path = require('path');
const _ = require('underscore');

const config = require('config/config');
const logger = require('config/logger');
var responseError = require('routes/errorHandler.js');
var testExecutionImpl = require('services/db/testExecutionImpl.js');
var executionObj = new testExecutionImpl();
var throughputImpl = require('services/db/throughputImpl.js');
var throughputObj = new throughputImpl();


var routes = function() {

};
module.exports = routes;

/******* XLSX Writer Controller ******/

/*
    This function takes no paramters.
    Creates a new xlsx excel workbook and adds the Summary sheet values obtained from database.
*/
var generateSummary = async function() {
    try {
        const workbook = new ExcelJS.Workbook(); // creates a new workbook
        const sheet = workbook.addWorksheet('Summary'); // add sheet with name "Summary" to the workbook
        const rows = [
            [''],
            ['Product', ''],
            ['Firmware Version', ''],
            ['DATE', ''],
            [''],
            [''],
            ['Test Section', 'Total', 'Pass', 'Fail', 'NA', 'Not Run', 'Completed[%]', 'Passed[%]']
        ];
        sheet.addRows(rows); // adds the data row wise to Summary sheet

        // border styles for the given cells
        ['A2', 'B2', 'A3', 'B3', 'A4', 'B4'].map(key => {
            sheet.getCell(key).border = {
                top: { style: 'thin', color: { argb: 'FF000000' } },
                left: { style: 'thin', color: { argb: 'FF000000' } },
                bottom: { style: 'thin', color: { argb: 'FF000000' } },
                right: { style: 'thin', color: { argb: 'FF000000' } }
            };
        });

        let row = sheet.getRow(7); // get row number 7 from given Summary sheet

        // font and fill styles for the cells of row 7
        row.eachCell(function(cell, colNumber) {
            row.getCell(colNumber).font = { color: { argb: 'FFFFFFFF' }, bold: true };
            row.getCell(colNumber).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF0066CC' } };
        });

        await workbook.xlsx.writeFile('./public/Output/export.xlsx'); // write the workbook contents in .xlsx file
        return './public/Output/export.xlsx';
    } catch (err) {
        logger.error("generateOutputFile : ", err);
    }
}


/*
    This function takes the file path, testsuite names array and execution results as parameter.
    Reads the specified file and adds the sheets with given testsuite names.
    Writes the execution results testsuite wise in each sheet.
*/
var generateSuites = async function(file, suiteNames, results) {
    try {
        let workbook = new ExcelJS.Workbook(); // creates a new workbook

        // read the specified file from given path
        await workbook.xlsx.readFile(file)
            .then(async function() {
                // loop for every sheet with testsuite name and data
                for (let suite of suiteNames) {
                    const sheet = workbook.addWorksheet(suite); // add sheet with name as testsuite name
                    sheet.addRow(['Test No', 'Test Case', 'Result', 'Comments']); // header for the sheet

                    let header = sheet.getRow(1); // get the row number 1 from given sheet
                    // apply font and fill styles for the given row
                    header.eachCell(function(cell, colNumber) {
                        header.getCell(colNumber).font = { color: { argb: 'FFFFFFFF' }, bold: true };
                        header.getCell(colNumber).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF0066CC' } };
                    });

                    for (let data of results) {
                        if (data.test_suite_name == suite) {
                            let new_row = [];
                            new_row.push(data.test_no);
                            new_row.push(data.test_case);
                            new_row.push(data.status);
                            new_row.push(data.comments);

                            sheet.addRow(new_row);

                            let added_row = sheet.lastRow;
                            let fillColor = {};
                            // console.log(data.test_no.split('.').length);
                            if (data.test_no == '') {
                                fillColor = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFD0D0E1' } };
                                styleRow(fillColor);
                            } else if ((data.test_no.split('.').length == 1) && (data.status == '')) {
                                fillColor = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFB3DAFF' } };
                                styleRow(fillColor);
                            } else if ((data.test_no.split('.').length == 2) && (data.status == '')) {
                                fillColor = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE6FFFF' } };
                                styleRow(fillColor);
                            } else if ((data.test_no.split('.').length == 3) && (data.status == '')) {
                                fillColor = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFFF99' } };
                                styleRow(fillColor);
                            } else {
                                fillColor = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFFFFF' } };
                                styleRow(fillColor);
                            }

                            function styleRow(fillColor) {
                                added_row.eachCell(function(cell, colNumber) {
                                    added_row.getCell(colNumber).fill = fillColor;
                                    added_row.getCell(colNumber).border = {
                                        top: { style: 'thin', color: { argb: 'FF000000' } },
                                        left: { style: 'thin', color: { argb: 'FF000000' } },
                                        bottom: { style: 'thin', color: { argb: 'FF000000' } },
                                        right: { style: 'thin', color: { argb: 'FF000000' } }
                                    }
                                });
                            }

                        }
                    }


                    // sheet.eachRow(function(row, rowNumber) {
                    //     // console.log('Row ' + rowNumber + ' = ' + JSON.stringify(row.values));
                    //     row.eachCell(function(cell, colNumber) {
                    //         // if(cell[colNumber] == 1) {
                    //             console.log(cell);
                    //         // }
                    //     })
                    //     // console.log(JSON.stringify(row.values));
                    //   });
                }
                await workbook.xlsx.writeFile('./public/Output/export.xlsx'); // write and save it in .xlsx file
            });

    } catch (err) {
        logger.error("generateSuites : ", err);
    }
}


/*
    Creates a new xlsx excel workbook from the existing Functionality template by comparing given executions.
*/
async function functionalityComparison(executionId) {
    try {
        let executions = [];
        for (let item of executionId) {
            let execution = await executionObj.getExecutionResults(item);
            execution = _.filter(execution, function(val) {
                return val['status'] != '';
            });
            //console.log("filtered execution-", execution);
            executions.push(execution);
        }
        //console.log("executions--", _.flatten(executions));
        executions = _.flatten(executions);
        var uniqTestCases = _.pluck(_.uniq(_.union(executions), false, _.property('test_no')), 'test_no');
        var testCompareObjects = [];

        _.each(uniqTestCases, function(element, index) {
            var testCompareObject = {};

            let commonElements = _.filter(executions, function(p) { return p['test_no'] == element; });
            // console.log("common---", commonElements);
            testCompareObject['test_no'] = commonElements[0]['test_no'];
            testCompareObject['test_case'] = commonElements[0]['test_case'];

            for (let item of commonElements) {
                testCompareObject[item.execution_id] = {
                    'status': item['status'],
                    'comments': item['comments']
                };
            }

            //console.log("testCompareObject--", testCompareObject);

            testCompareObjects.push(testCompareObject);
        });

        return testCompareObjects;
    } catch (err) {
        logger.error("functionalityComparison : ", err);
    }
}


/*
    Creates a new xlsx excel workbook from the existing Unified KPI template for given TP execution.
*/
async function generateUnifiedReport(data, executionName, project_type) {
    try {
        const workbook = new ExcelJS.Workbook(); // creates a new workbook
        //let templateFile = config.public.path + config.public.templates + "Unified_All_KPI_Template_v1_20200911.xlsx";
        let templateFile = config.public.path + config.public.templates + "STA_TP.xlsx";
        let file = config.public.path + config.public.output + executionName + 'KPI_Report.xlsx';

        await workbook.xlsx.readFile(templateFile)
            .then(async function() {
                let worksheet = workbook.getWorksheet("STA_TP"); // get particular sheet
                let row_num = 8;
                let startRow = worksheet.getRow(row_num);
                let headers = await throughputObj.findHeader(project_type);
                let headerData = headers.header[2];
                let slVal = 1;
                for (let item of data) {
                    startRow = worksheet.getRow(row_num);

                    startRow.getCell(1).value = '';
                    startRow.getCell(2).value = '';
                    startRow.getCell(3).value = slVal;
                    startRow.getCell(4).value = item["TP TYPE"];
                    startRow.getCell(5).value = item["DUT"];
                    startRow.getCell(6).value = item["SoC Version"];
                    startRow.getCell(7).value = item["SoC TYPE"];
                    startRow.getCell(8).value = item["DUT Fw/Drv"];
                    startRow.getCell(9).value = item["Interface"];
                    startRow.getCell(10).value = item["Aggregation"];
                    startRow.getCell(11).value = item["Spatial Streams"];
                    startRow.getCell(12).value = item["Guard Interval"];
                    startRow.getCell(13).value = item["Data Rate"];
                    startRow.getCell(14).value = item["Channel | 2 GHz"];
                    startRow.getCell(15).value = item["Channel | 5 GHz"];
                    startRow.getCell(16).value = item["SDIO Clock"];
                    startRow.getCell(17).value = item["Companion Device/Ex-AP/Ex-STA/Ex-P2P-GO/Ex-P2P-GC"];
                    startRow.getCell(18).value = item["Companion Device FW/Drv"];
                    startRow.getCell(19).value = item["Host Platform"];
                    startRow.getCell(20).value = item["OS"];
                    startRow.getCell(21).value = item["DUT Beamforming Config"];
                    startRow.getCell(22).value = item["Companion Device Beamforming Config"];
                    startRow.getCell(23).value = item["DUT LDPC"];
                    startRow.getCell(24).value = item["DUT STBC"];
                    startRow.getCell(25).value = item["EdMac"];
                    startRow.getCell(26).value = item["More Config"];
                    startRow.getCell(27).value = item["Security"];
                    startRow.getCell(28).value = item["Test Repetition"];
                    startRow.getCell(29).value = '';
                    let bandRow = 30;

                    console.log("headerData-->", headerData);
                    for (let index = 0; index < headerData.length; index++) {

                        startRow.getCell(bandRow).value = (item[headerData[index]] ? item[headerData[index]]["Tcp_Tx"]["value"] : '');
                        if (typeof item[headerData[index]] != "undefined") {
                            if (typeof item[headerData[index]]["Tcp_Tx"]["Limit_value_TCP-Tx"] != "undefined" && item[headerData[index]]["Tcp_Tx"]["Limit_value_TCP-Tx"] != "") {
                                if (Number(item[headerData[index]] ? item[headerData[index]]["Tcp_Tx"]["value"] : '') >= Number(item[headerData[index]] ? item[headerData[index]]["Tcp_Tx"]["Limit_value_TCP-Tx"] : '')) {
                                    startRow.getCell(bandRow).style.font = { color: { argb: 'FF00FF00' } };
                                } else {
                                    startRow.getCell(bandRow).style.font = { color: { argb: 'FFFF0000' } };
                                }
                            }
                        }

                        if (typeof item[headerData[index]] != "undefined") {
                            startRow.getCell(bandRow + 1).value = (item[headerData[index]] ? item[headerData[index]]["Tcp_Rx"]["value"] : '');
                            if (typeof item[headerData[index]]["Tcp_Rx"]["Limit_value_TCP-Rx"] != "undefined" && item[headerData[index]]["Tcp_Rx"]["Limit_value_TCP-Rx"] != "") {
                                if (Number(item[headerData[index]] ? item[headerData[index]]["Tcp_Rx"]["value"] : '') >= Number(item[headerData[index]] ? item[headerData[index]]["Tcp_Rx"]["Limit_value_TCP-Rx"] : '')) {
                                    startRow.getCell(bandRow + 1).style.font = { color: { argb: 'FF00FF00' } };
                                } else {
                                    startRow.getCell(bandRow + 1).style.font = { color: { argb: 'FFFF0000' } };
                                }
                            }
                        }

                        if (typeof item[headerData[index]] != "undefined") {
                            startRow.getCell(bandRow + 2).value = (item[headerData[index]] ? item[headerData[index]]["Udp_Tx"]["value"] : '');
                            if (typeof item[headerData[index]]["Udp_Tx"]["Limit_value_UDP-Tx"] != "undefined" && item[headerData[index]]["Udp_Tx"]["Limit_value_UDP-Tx"] != "") {
                                if (Number(item[headerData[index]] ? item[headerData[index]]["Udp_Tx"]["value"] : '') >= Number(item[headerData[index]] ? item[headerData[index]]["Udp_Tx"]["Limit_value_UDP-Tx"] : '')) {
                                    startRow.getCell(bandRow + 2).style.font = { color: { argb: 'FF00FF00' } };
                                } else {
                                    startRow.getCell(bandRow + 2).style.font = { color: { argb: 'FFFF0000' } };
                                }
                            }
                        }

                        if (typeof item[headerData[index]] != "undefined") {
                            startRow.getCell(bandRow + 3).value = (item[headerData[index]] ? item[headerData[index]]["Udp_Rx"]["value"] : '');
                            if (typeof item[headerData[index]]["Udp_Rx"]["Limit_value_UDP-Rx"] != "undefined" && item[headerData[index]]["Udp_Rx"]["Limit_value_UDP-Rx"] != "") {
                                if (Number(item[headerData[index]] ? item[headerData[index]]["Udp_Rx"]["value"] : '') >= Number(item[headerData[index]] ? item[headerData[index]]["Udp_Rx"]["Limit_value_UDP-Rx"] : '')) {
                                    startRow.getCell(bandRow + 3).style.font = { color: { argb: 'FF00FF00' } };
                                } else {
                                    startRow.getCell(bandRow + 3).style.font = { color: { argb: 'FFFF0000' } };
                                }
                            }
                        }

                        startRow.getCell(bandRow + 4).value = '';

                        bandRow = bandRow + 5;

                    }
                    row_num += 1;
                    slVal += 1;
                }

                await workbook.xlsx.writeFile(file); // xlsx format generated from the above template
                console.log("file - ", file);
            });
        console.log("file return- ", file);
        return file;
    } catch (err) {
        logger.error("generateUnifiedReport : ", err);
    }
}


/*
    Creates a new xlsx excel workbook from the existing Unified KPI template for given TP execution.
*/
async function generateTPCompareReport(data, executionName, benchmarksCount, compareArray) {
    let value;
    try {
        const workbook = new ExcelJS.Workbook(); // creates a new workbook
        let templateFile = config.public.path + config.public.templates + "TP_Compare_Report.xlsx";
        let file = config.public.path + config.public.output + executionName + 'KPI_Report.xlsx';

        await workbook.xlsx.readFile(templateFile)
            .then(async function() {
                let worksheet = workbook.getWorksheet("Standalone_TP_Compare"); // get particular sheet
                let row_num = 4;
                let startRow = worksheet.getRow(row_num);
                let row = 4;
                let newRow;
                let rowName;

                data.forEach(element => {
                    for (let item of element) {
                        value = 10;

                        if (compareArray.compare.length > 0) {
                            let ar = _.pluck(compareArray.compare, "id");
                            if (ar.includes(item._id.toString())) {
                                let ch = compareArray.compare.filter(ele => ele.id == item._id.toString());
                                value = ch[ch.length - 1].value;
                            }
                        }
                        //console.log(item);_.pluck()
                        console.log(item.execution_name);
                        rowName = '';
                        if (item.isBenchmark == true) {
                            if (benchmarksCount != 0) {
                                value = "";
                                console.log('Count', benchmarksCount);
                                // rowName = 'Benchmark -' + item.execution_name;
                                rowName = item.benchmark_label;
                                benchmarksCount--;
                            } else {
                                rowName = item.execution_name;
                            }
                        } else {
                            rowName = item.execution_name;
                        }

                        newRow = [rowName, '', ''];

                        // console.log("row--", item);
                        //console.log(item["Security"]);

                        /* Static column values for TP KPI data */
                        newRow.push(item["TP TYPE"], item["DUT"], item["SoC Version"], item["SoC TYPE"], item["DUT Fw/Drv"],
                            item["Interface"], item["Aggregation"], item["Spatial Streams"], item["Guard Interval"], item["Data Rate"],
                            item["Channel | 2 GHz"], item["Channel | 5 GHz"], item["SDIO Clock"], item["Companion Device/Ex-AP/Ex-STA/Ex-P2P-GO/Ex-P2P-GC"], item["Companion Device FW/Drv"],
                            item["Host Platform"], item["OS"], item["DUT Beamforming Config"], item["Companion Device Beamforming Config"],
                            item["DUT LDPC"], item["DUT STBC"], item["EdMac"], item["More Config"], item["Security"], item["Test Repetition"]);

                        /* Band Mapped column values for TP KPI data */
                        newRow.push('', value, '', (item["HE-160MHz | 5GHz"] ? item["HE-160MHz | 5GHz"]["Tcp_Tx"]["value"] : ''), worksheet.getCell(`AG${row}`).value = { formula: `=IFERROR(IF( ABS( ((@INDEX(AF:AF,$AD${row})-AF${row})/@INDEX(AF:AF,$AD${row}))*-1 )>$W$1, ( ((@INDEX(AF:AF,$AD${row})-AF${row})/@INDEX(AF:AF,$AD${row}))*-1), ""), "")` }, (item["HE-160MHz | 5GHz"] ? item["HE-160MHz | 5GHz"]["Tcp_Rx"]["value"] : ''), worksheet.getCell(`AI${row}`).value = { formula: `=IFERROR(IF( ABS( ((@INDEX(AH:AH,$AD${row})-AH${row})/@INDEX(AH:AH,$AD${row}))*-1 )>$W$1, ( ((@INDEX(AH:AH,$AD${row})-AH${row})/@INDEX(AH:AH,$AD${row}))*-1), ""), "")` }, (item["HE-160MHz | 5GHz"] ? item["HE-160MHz | 5GHz"]["Udp_Tx"]["value"] : ''), worksheet.getCell(`AK${row}`).value = { formula: `=IFERROR(IF( ABS( ((@INDEX(AJ:AJ,$AD${row})-AJ${row})/@INDEX(AJ:AJ,$AD${row}))*-1 )>$W$1, ( ((@INDEX(AJ:AJ,$AD${row})-AJ${row})/@INDEX(AJ:AJ,$AD${row}))*-1), ""), "")` }, (item["HE-160MHz | 5GHz"] ? item["HE-160MHz | 5GHz"]["Udp_Rx"]["value"] : ''), worksheet.getCell(`AM${row}`).value = { formula: `=IFERROR(IF( ABS( ((@INDEX(AL:AL,$AD${row})-AL${row})/@INDEX(AL:AL,$AD${row}))*-1 )>$W$1, ( ((@INDEX(AL:AL,$AD${row})-AL${row})/@INDEX(AL:AL,$AD${row}))*-1), ""), "")` });
                        newRow.push('', (item["HE-80MHz | 5GHz"] ? item["HE-80MHz | 5GHz"]["Tcp_Tx"]["value"] : ''), worksheet.getCell(`AP${row}`).value = { formula: `=IFERROR(IF( ABS( ((@INDEX(AO:AO,$AD${row})-AO${row})/@INDEX(AO:AO,$AD${row}))*-1 )>$W$1, ( ((@INDEX(AO:AO,$AD${row})-AO${row})/@INDEX(AO:AO,$AD${row}))*-1), ""), "")` }, (item["HE-80MHz | 5GHz"] ? item["HE-80MHz | 5GHz"]["Tcp_Rx"]["value"] : ''), worksheet.getCell(`AR${row}`).value = { formula: `=IFERROR(IF( ABS( ((@INDEX(AQ:AQ,$AD${row})-AQ${row})/@INDEX(AQ:AQ,$AD${row}))*-1 )>$W$1, ( ((@INDEX(AQ:AQ,$AD${row})-AQ${row})/@INDEX(AQ:AQ,$AD${row}))*-1), ""), "")` }, (item["HE-80MHz | 5GHz"] ? item["HE-80MHz | 5GHz"]["Udp_Tx"]["value"] : ''), worksheet.getCell(`AT${row}`).value = { formula: `=IFERROR(IF( ABS( ((@INDEX(AS:AS,$AD${row})-AS${row})/@INDEX(AS:AS,$AD${row}))*-1 )>$W$1, ( ((@INDEX(AS:AS,$AD${row})-AS${row})/@INDEX(AS:AS,$AD${row}))*-1), ""), "")` }, (item["HE-80MHz | 5GHz"] ? item["HE-80MHz | 5GHz"]["Udp_Rx"]["value"] : ''), worksheet.getCell(`AV${row}`).value = { formula: `=IFERROR(IF( ABS( ((@INDEX(AU:AU,$AD${row})-AU${row})/@INDEX(AU:AU,$AD${row}))*-1 )>$W$1, ( ((@INDEX(AU:AU,$AD${row})-AU${row})/@INDEX(AU:AU,$AD${row}))*-1), ""), "")` });
                        newRow.push('', (item["HE-40MHz | 5GHz"] ? item["HE-40MHz | 5GHz"]["Tcp_Tx"]["value"] : ''), worksheet.getCell(`AY${row}`).value = { formula: `=IFERROR(IF( ABS( ((@INDEX(AX:AX,$AD${row})-AX${row})/@INDEX(AX:AX,$AD${row}))*-1 )>$W$1, ( ((@INDEX(AX:AX,$AD${row})-AX${row})/@INDEX(AX:AX,$AD${row}))*-1), ""), "")` }, (item["HE-40MHz | 5GHz"] ? item["HE-40MHz | 5GHz"]["Tcp_Rx"]["value"] : ''), worksheet.getCell(`BA${row}`).value = { formula: `=IFERROR(IF( ABS( ((@INDEX(AZ:AZ,$AD${row})-AZ${row})/@INDEX(AZ:AZ,$AD${row}))*-1 )>$W$1, ( ((@INDEX(AZ:AZ,$AD${row})-AZ${row})/@INDEX(AZ:AZ,$AD${row}))*-1), ""), "")` }, (item["HE-40MHz | 5GHz"] ? item["HE-40MHz | 5GHz"]["Udp_Tx"]["value"] : ''), worksheet.getCell(`BC${row}`).value = { formula: `=IFERROR(IF( ABS( ((@INDEX(BB:BB,$AD${row})-BB${row})/@INDEX(BB:BB,$AD${row}))*-1 )>$W$1, ( ((@INDEX(BB:BB,$AD${row})-BB${row})/@INDEX(BB:BB,$AD${row}))*-1), ""), "")` }, (item["HE-40MHz | 5GHz"] ? item["HE-40MHz | 5GHz"]["Udp_Rx"]["value"] : ''), worksheet.getCell(`BE${row}`).value = { formula: `=IFERROR(IF( ABS( ((@INDEX(BD:BD,$AD${row})-BD${row})/@INDEX(BD:BD,$AD${row}))*-1 )>$W$1, ( ((@INDEX(BD:BD,$AD${row})-BD${row})/@INDEX(BD:BD,$AD${row}))*-1), ""), "")` });
                        newRow.push('', (item["HE-20MHz | 5GHz"] ? item["HE-20MHz | 5GHz"]["Tcp_Tx"]["value"] : ''), worksheet.getCell(`BH${row}`).value = { formula: `=IFERROR(IF( ABS( ((@INDEX(BG:BG,$AD${row})-BG${row})/@INDEX(BG:BG,$AD${row}))*-1 )>$W$1, ( ((@INDEX(BG:BG,$AD${row})-BG${row})/@INDEX(BG:BG,$AD${row}))*-1), ""), "")` }, (item["HE-20MHz | 5GHz"] ? item["HE-20MHz | 5GHz"]["Tcp_Rx"]["value"] : ''), worksheet.getCell(`BJ${row}`).value = { formula: `=IFERROR(IF( ABS( ((@INDEX(BI:BI,$AD${row})-BI${row})/@INDEX(BI:BI,$AD${row}))*-1 )>$W$1, ( ((@INDEX(BI:BI,$AD${row})-BI${row})/@INDEX(BI:BI,$AD${row}))*-1), ""), "")` }, (item["HE-20MHz | 5GHz"] ? item["HE-20MHz | 5GHz"]["Udp_Tx"]["value"] : ''), worksheet.getCell(`BL${row}`).value = { formula: `=IFERROR(IF( ABS( ((@INDEX(BK:BK,$AD${row})-BK${row})/@INDEX(BK:BK,$AD${row}))*-1 )>$W$1, ( ((@INDEX(BK:BK,$AD${row})-BK${row})/@INDEX(BK:BK,$AD${row}))*-1), ""), "")` }, (item["HE-20MHz | 5GHz"] ? item["HE-20MHz | 5GHz"]["Udp_Rx"]["value"] : ''), worksheet.getCell(`BN${row}`).value = { formula: `=IFERROR(IF( ABS( ((@INDEX(BM:BM,$AD${row})-BM${row})/@INDEX(BM:BM,$AD${row}))*-1 )>$W$1, ( ((@INDEX(BM:BM,$AD${row})-BM${row})/@INDEX(BM:BM,$AD${row}))*-1), ""), "")` });
                        newRow.push('', (item["HE-40MHz | 2GHz"] ? item["HE-40MHz | 2GHz"]["Tcp_Tx"]["value"] : ''), worksheet.getCell(`BQ${row}`).value = { formula: `=IFERROR(IF( ABS( ((@INDEX(BP:BP,$AD${row})-BP${row})/@INDEX(BP:BP,$AD${row}))*-1 )>$W$1, ( ((@INDEX(BP:BP,$AD${row})-BP${row})/@INDEX(BP:BP,$AD${row}))*-1), ""), "")` }, (item["HE-40MHz | 2GHz"] ? item["HE-40MHz | 2GHz"]["Tcp_Rx"]["value"] : ''), worksheet.getCell(`BS${row}`).value = { formula: `=IFERROR(IF( ABS( ((@INDEX(BR:BR,$AD${row})-BR${row})/@INDEX(BR:BR,$AD${row}))*-1 )>$W$1, ( ((@INDEX(BR:BR,$AD${row})-BR${row})/@INDEX(BR:BR,$AD${row}))*-1), ""), "")` }, (item["HE-40MHz | 2GHz"] ? item["HE-40MHz | 2GHz"]["Udp_Tx"]["value"] : ''), worksheet.getCell(`BU${row}`).value = { formula: `=IFERROR(IF( ABS( ((@INDEX(BT:BT,$AD${row})-BT${row})/@INDEX(BT:BT,$AD${row}))*-1 )>$W$1, ( ((@INDEX(BT:BT,$AD${row})-BT${row})/@INDEX(BT:BT,$AD${row}))*-1), ""), "")` }, (item["HE-40MHz | 2GHz"] ? item["HE-40MHz | 2GHz"]["Udp_Rx"]["value"] : ''), worksheet.getCell(`BW${row}`).value = { formula: `=IFERROR(IF( ABS( ((@INDEX(BV:BV,$AD${row})-BV${row})/@INDEX(BV:BV,$AD${row}))*-1 )>$W$1, ( ((@INDEX(BV:BV,$AD${row})-BV${row})/@INDEX(BV:BV,$AD${row}))*-1), ""), "")` });
                        newRow.push('', (item["HE-20MHz | 2GHz"] ? item["HE-20MHz | 2GHz"]["Tcp_Tx"]["value"] : ''), worksheet.getCell(`BZ${row}`).value = { formula: `=IFERROR(IF( ABS( ((@INDEX(BY:BY,$AD${row})-BY${row})/@INDEX(BY:BY,$AD${row}))*-1 )>$W$1, ( ((@INDEX(BY:BY,$AD${row})-BY${row})/@INDEX(BY:BY,$AD${row}))*-1), ""), "")` }, (item["HE-20MHz | 2GHz"] ? item["HE-20MHz | 2GHz"]["Tcp_Rx"]["value"] : ''), worksheet.getCell(`CB${row}`).value = { formula: `=IFERROR(IF( ABS( ((@INDEX(CA:CA,$AD${row})-CA${row})/@INDEX(CA:CA,$AD${row}))*-1 )>$W$1, ( ((@INDEX(CA:CA,$AD${row})-CA${row})/@INDEX(CA:CA,$AD${row}))*-1), ""), "")` }, (item["HE-20MHz | 2GHz"] ? item["HE-20MHz | 2GHz"]["Udp_Tx"]["value"] : ''), worksheet.getCell(`CD${row}`).value = { formula: `=IFERROR(IF( ABS( ((@INDEX(CC:CC,$AD${row})-CC${row})/@INDEX(CC:CC,$AD${row}))*-1 )>$W$1, ( ((@INDEX(CC:CC,$AD${row})-CC${row})/@INDEX(CC:CC,$AD${row}))*-1), ""), "")` }, (item["HE-20MHz | 2GHz"] ? item["HE-20MHz | 2GHz"]["Udp_Rx"]["value"] : ''), worksheet.getCell(`CF${row}`).value = { formula: `=IFERROR(IF( ABS( ((@INDEX(CE:CE,$AD${row})-CE${row})/@INDEX(CE:CE,$AD${row}))*-1 )>$W$1, ( ((@INDEX(CE:CE,$AD${row})-CE${row})/@INDEX(CE:CE,$AD${row}))*-1), ""), "")` });
                        newRow.push('', (item["VHT-160MHz | 5GHz"] ? item["VHT-160MHz | 5GHz"]["Tcp_Tx"]["value"] : ''), worksheet.getCell(`CI${row}`).value = { formula: `=IFERROR(IF( ABS( ((@INDEX(CH:CH,$AD${row})-CH${row})/@INDEX(CH:CH,$AD${row}))*-1 )>$W$1, ( ((@INDEX(CH:CH,$AD${row})-CH${row})/@INDEX(CH:CH,$AD${row}))*-1), ""), "")` }, (item["VHT-160MHz | 5GHz"] ? item["VHT-160MHz | 5GHz"]["Tcp_Rx"]["value"] : ''), worksheet.getCell(`CK${row}`).value = { formula: `=IFERROR(IF( ABS( ((@INDEX(CJ:CJ,$AD${row})-CJ${row})/@INDEX(CJ:CJ,$AD${row}))*-1 )>$W$1, ( ((@INDEX(CJ:CJ,$AD${row})-CJ${row})/@INDEX(CJ:CJ,$AD${row}))*-1), ""), "")` }, (item["VHT-160MHz | 5GHz"] ? item["VHT-160MHz | 5GHz"]["Udp_Tx"]["value"] : ''), worksheet.getCell(`CM${row}`).value = { formula: `=IFERROR(IF( ABS( ((@INDEX(CL:CL,$AD${row})-CL${row})/@INDEX(CL:CL,$AD${row}))*-1 )>$W$1, ( ((@INDEX(CL:CL,$AD${row})-CL${row})/@INDEX(CL:CL,$AD${row}))*-1), ""), "")` }, (item["VHT-160MHz | 5GHz"] ? item["VHT-160MHz | 5GHz"]["Udp_Rx"]["value"] : ''), worksheet.getCell(`CO${row}`).value = { formula: `=IFERROR(IF( ABS( ((@INDEX(CN:CN,$AD${row})-CN${row})/@INDEX(CN:CN,$AD${row}))*-1 )>$W$1, ( ((@INDEX(CN:CN,$AD${row})-CN${row})/@INDEX(CN:CN,$AD${row}))*-1), ""), "")` });
                        newRow.push('', (item["VHT-80MHz | 5GHz"] ? item["VHT-80MHz | 5GHz"]["Tcp_Tx"]["value"] : ''), worksheet.getCell(`CR${row}`).value = { formula: `=IFERROR(IF( ABS( ((@INDEX(CQ:CQ,$AD${row})-CQ${row})/@INDEX(CQ:CQ,$AD${row}))*-1 )>$W$1, ( ((@INDEX(CQ:CQ,$AD${row})-CQ${row})/@INDEX(CQ:CQ,$AD${row}))*-1), ""), "")` }, (item["VHT-80MHz | 5GHz"] ? item["VHT-80MHz | 5GHz"]["Tcp_Rx"]["value"] : ''), worksheet.getCell(`CT${row}`).value = { formula: `=IFERROR(IF( ABS( ((@INDEX(CS:CS,$AD${row})-CS${row})/@INDEX(CS:CS,$AD${row}))*-1 )>$W$1, ( ((@INDEX(CS:CS,$AD${row})-CS${row})/@INDEX(CS:CS,$AD${row}))*-1), ""), "")` }, (item["VHT-80MHz | 5GHz"] ? item["VHT-80MHz | 5GHz"]["Udp_Tx"]["value"] : ''), worksheet.getCell(`CV${row}`).value = { formula: `=IFERROR(IF( ABS( ((@INDEX(CU:CU,$AD${row})-CU${row})/@INDEX(CU:CU,$AD${row}))*-1 )>$W$1, ( ((@INDEX(CU:CU,$AD${row})-CU${row})/@INDEX(CU:CU,$AD${row}))*-1), ""), "")` }, (item["VHT-80MHz | 5GHz"] ? item["VHT-80MHz | 5GHz"]["Udp_Rx"]["value"] : ''), worksheet.getCell(`CX${row}`).value = { formula: `=IFERROR(IF( ABS( ((@INDEX(CW:CW,$AD${row})-CW${row})/@INDEX(CW:CW,$AD${row}))*-1 )>$W$1, ( ((@INDEX(CW:CW,$AD${row})-CW${row})/@INDEX(CW:CW,$AD${row}))*-1), ""), "")` });
                        newRow.push('', (item["VHT-40MHz | 5GHz"] ? item["VHT-40MHz | 5GHz"]["Tcp_Tx"]["value"] : ''), worksheet.getCell(`DA${row}`).value = { formula: `=IFERROR(IF( ABS( ((@INDEX(CZ:CZ,$AD${row})-CZ${row})/@INDEX(CZ:CZ,$AD${row}))*-1 )>$W$1, ( ((@INDEX(CZ:CZ,$AD${row})-CZ${row})/@INDEX(CZ:CZ,$AD${row}))*-1), ""), "")` }, (item["VHT-40MHz | 5GHz"] ? item["VHT-40MHz | 5GHz"]["Tcp_Rx"]["value"] : ''), worksheet.getCell(`DC${row}`).value = { formula: `=IFERROR(IF( ABS( ((@INDEX(DB:DB,$AD${row})-DB${row})/@INDEX(DB:DB,$AD${row}))*-1 )>$W$1, ( ((@INDEX(DB:DB,$AD${row})-DB${row})/@INDEX(DB:DB,$AD${row}))*-1), ""), "")` }, (item["VHT-40MHz | 5GHz"] ? item["VHT-40MHz | 5GHz"]["Udp_Tx"]["value"] : ''), worksheet.getCell(`DE${row}`).value = { formula: `=IFERROR(IF( ABS( ((@INDEX(DD:DD,$AD${row})-DD${row})/@INDEX(DD:DD,$AD${row}))*-1 )>$W$1, ( ((@INDEX(DD:DD,$AD${row})-DD${row})/@INDEX(DD:DD,$AD${row}))*-1), ""), "")` }, (item["VHT-40MHz | 5GHz"] ? item["VHT-40MHz | 5GHz"]["Udp_Rx"]["value"] : ''), worksheet.getCell(`DG${row}`).value = { formula: `=IFERROR(IF( ABS( ((@INDEX(DF:DF,$AD${row})-DF${row})/@INDEX(DF:DF,$AD${row}))*-1 )>$W$1, ( ((@INDEX(DF:DF,$AD${row})-DF${row})/@INDEX(DF:DF,$AD${row}))*-1), ""), "")` });
                        newRow.push('', (item["VHT-20MHz | 5GHz"] ? item["VHT-20MHz | 5GHz"]["Tcp_Tx"]["value"] : ''), worksheet.getCell(`DJ${row}`).value = { formula: `=IFERROR(IF( ABS( ((@INDEX(DI:DI,$AD${row})-DI${row})/@INDEX(DI:DI,$AD${row}))*-1 )>$W$1, ( ((@INDEX(DI:DI,$AD${row})-DI${row})/@INDEX(DI:DI,$AD${row}))*-1), ""), "")` }, (item["VHT-20MHz | 5GHz"] ? item["VHT-20MHz | 5GHz"]["Tcp_Rx"]["value"] : ''), worksheet.getCell(`DL${row}`).value = { formula: `=IFERROR(IF( ABS( ((@INDEX(DK:DK,$AD${row})-DK${row})/@INDEX(DK:DK,$AD${row}))*-1 )>$W$1, ( ((@INDEX(DK:DK,$AD${row})-DK${row})/@INDEX(DK:DK,$AD${row}))*-1), ""), "")` }, (item["VHT-20MHz | 5GHz"] ? item["VHT-20MHz | 5GHz"]["Udp_Tx"]["value"] : ''), worksheet.getCell(`DN${row}`).value = { formula: `=IFERROR(IF( ABS( ((@INDEX(DM:DM,$AD${row})-DM${row})/@INDEX(DM:DM,$AD${row}))*-1 )>$W$1, ( ((@INDEX(DM:DM,$AD${row})-DM${row})/@INDEX(DM:DM,$AD${row}))*-1), ""), "")` }, (item["VHT-20MHz | 5GHz"] ? item["VHT-20MHz | 5GHz"]["Udp_Rx"]["value"] : ''), worksheet.getCell(`DP${row}`).value = { formula: `=IFERROR(IF( ABS( ((@INDEX(DO:DO,$AD${row})-DO${row})/@INDEX(DO:DO,$AD${row}))*-1 )>$W$1, ( ((@INDEX(DO:DO,$AD${row})-DO${row})/@INDEX(DO:DO,$AD${row}))*-1), ""), "")` });
                        newRow.push('', (item["VHT-40MHz | 2GHz"] ? item["VHT-40MHz | 2GHz"]["Tcp_Tx"]["value"] : ''), worksheet.getCell(`DS${row}`).value = { formula: `=IFERROR(IF( ABS( ((@INDEX(DR:DR,$AD${row})-DR${row})/@INDEX(DR:DR,$AD${row}))*-1 )>$W$1, ( ((@INDEX(DR:DR,$AD${row})-DR${row})/@INDEX(DR:DR,$AD${row}))*-1), ""), "")` }, (item["VHT-40MHz | 2GHz"] ? item["VHT-40MHz | 2GHz"]["Tcp_Rx"]["value"] : ''), worksheet.getCell(`DU${row}`).value = { formula: `=IFERROR(IF( ABS( ((@INDEX(DT:DT,$AD${row})-DT${row})/@INDEX(DT:DT,$AD${row}))*-1 )>$W$1, ( ((@INDEX(DT:DT,$AD${row})-DT${row})/@INDEX(DT:DT,$AD${row}))*-1), ""), "")` }, (item["VHT-40MHz | 2GHz"] ? item["VHT-40MHz | 2GHz"]["Udp_Tx"]["value"] : ''), worksheet.getCell(`DW${row}`).value = { formula: `=IFERROR(IF( ABS( ((@INDEX(DV:DV,$AD${row})-DV${row})/@INDEX(DV:DV,$AD${row}))*-1 )>$W$1, ( ((@INDEX(DV:DV,$AD${row})-DV${row})/@INDEX(DV:DV,$AD${row}))*-1), ""), "")` }, (item["VHT-40MHz | 2GHz"] ? item["VHT-40MHz | 2GHz"]["Udp_Rx"]["value"] : ''), worksheet.getCell(`DY${row}`).value = { formula: `=IFERROR(IF( ABS( ((@INDEX(DX:DX,$AD${row})-DX${row})/@INDEX(DX:DX,$AD${row}))*-1 )>$W$1, ( ((@INDEX(DX:DX,$AD${row})-DX${row})/@INDEX(DX:DX,$AD${row}))*-1), ""), "")` });
                        newRow.push('', (item["VHT-20MHz | 2GHz"] ? item["VHT-20MHz | 2GHz"]["Tcp_Tx"]["value"] : ''), worksheet.getCell(`EB${row}`).value = { formula: `=IFERROR(IF( ABS( ((@INDEX(EA:EA,$AD${row})-EA${row})/@INDEX(EA:EA,$AD${row}))*-1 )>$W$1, ( ((@INDEX(EA:EA,$AD${row})-EA${row})/@INDEX(EA:EA,$AD${row}))*-1), ""), "")` }, (item["VHT-20MHz | 2GHz"] ? item["VHT-20MHz | 2GHz"]["Tcp_Rx"]["value"] : ''), worksheet.getCell(`ED${row}`).value = { formula: `=IFERROR(IF( ABS( ((@INDEX(EC:EC,$AD${row})-EC${row})/@INDEX(EC:EC,$AD${row}))*-1 )>$W$1, ( ((@INDEX(EC:EC,$AD${row})-EC${row})/@INDEX(EC:EC,$AD${row}))*-1), ""), "")` }, (item["VHT-20MHz | 2GHz"] ? item["VHT-20MHz | 2GHz"]["Udp_Tx"]["value"] : ''), worksheet.getCell(`EF${row}`).value = { formula: `=IFERROR(IF( ABS( ((@INDEX(EE:EE,$AD${row})-EE${row})/@INDEX(EE:EE,$AD${row}))*-1 )>$W$1, ( ((@INDEX(EE:EE,$AD${row})-EE${row})/@INDEX(EE:EE,$AD${row}))*-1), ""), "")` }, (item["VHT-20MHz | 2GHz"] ? item["VHT-20MHz | 2GHz"]["Udp_Rx"]["value"] : ''), worksheet.getCell(`EH${row}`).value = { formula: `=IFERROR(IF( ABS( ((@INDEX(EG:EG,$AD${row})-EG${row})/@INDEX(EG:EG,$AD${row}))*-1 )>$W$1, ( ((@INDEX(EG:EG,$AD${row})-EG${row})/@INDEX(EG:EG,$AD${row}))*-1), ""), "")` });
                        newRow.push('', (item["HT-40MHz | 5GHz"] ? item["HT-40MHz | 5GHz"]["Tcp_Tx"]["value"] : ''), worksheet.getCell(`EK${row}`).value = { formula: `=IFERROR(IF( ABS( ((@INDEX(EJ:EJ,$AD${row})-EJ${row})/@INDEX(EJ:EJ,$AD${row}))*-1 )>$W$1, ( ((@INDEX(EJ:EJ,$AD${row})-EJ${row})/@INDEX(EJ:EJ,$AD${row}))*-1), ""), "")` }, (item["HT-40MHz | 5GHz"] ? item["HT-40MHz | 5GHz"]["Tcp_Rx"]["value"] : ''), worksheet.getCell(`EM${row}`).value = { formula: `=IFERROR(IF( ABS( ((@INDEX(EL:EL,$AD${row})-EL${row})/@INDEX(EL:EL,$AD${row}))*-1 )>$W$1, ( ((@INDEX(EL:EL,$AD${row})-EL${row})/@INDEX(EL:EL,$AD${row}))*-1), ""), "")` }, (item["HT-40MHz | 5GHz"] ? item["HT-40MHz | 5GHz"]["Udp_Tx"]["value"] : ''), worksheet.getCell(`EO${row}`).value = { formula: `=IFERROR(IF( ABS( ((@INDEX(EN:EN,$AD${row})-EN${row})/@INDEX(EN:EN,$AD${row}))*-1 )>$W$1, ( ((@INDEX(EN:EN,$AD${row})-EN${row})/@INDEX(EN:EN,$AD${row}))*-1), ""), "")` }, (item["HT-40MHz | 5GHz"] ? item["HT-40MHz | 5GHz"]["Udp_Rx"]["value"] : ''), worksheet.getCell(`EQ${row}`).value = { formula: `=IFERROR(IF( ABS( ((@INDEX(EP:EP,$AD${row})-EP${row})/@INDEX(EP:EP,$AD${row}))*-1 )>$W$1, ( ((@INDEX(EP:EP,$AD${row})-EP${row})/@INDEX(EP:EP,$AD${row}))*-1), ""), "")` });
                        newRow.push('', (item["HT-20MHz | 5GHz"] ? item["HT-20MHz | 5GHz"]["Tcp_Tx"]["value"] : ''), worksheet.getCell(`ET${row}`).value = { formula: `=IFERROR(IF( ABS( ((@INDEX(ES:ES,$AD${row})-ES${row})/@INDEX(ES:ES,$AD${row}))*-1 )>$W$1, ( ((@INDEX(ES:ES,$AD${row})-ES${row})/@INDEX(ES:ES,$AD${row}))*-1), ""), "")` }, (item["HT-20MHz | 5GHz"] ? item["HT-20MHz | 5GHz"]["Tcp_Rx"]["value"] : ''), worksheet.getCell(`EV${row}`).value = { formula: `=IFERROR(IF( ABS( ((@INDEX(EU:EU,$AD${row})-EU${row})/@INDEX(EU:EU,$AD${row}))*-1 )>$W$1, ( ((@INDEX(EU:EU,$AD${row})-EU${row})/@INDEX(EU:EU,$AD${row}))*-1), ""), "")` }, (item["HT-20MHz | 5GHz"] ? item["HT-20MHz | 5GHz"]["Udp_Tx"]["value"] : ''), worksheet.getCell(`EX${row}`).value = { formula: `=IFERROR(IF( ABS( ((@INDEX(EW:EW,$AD${row})-EW${row})/@INDEX(EW:EW,$AD${row}))*-1 )>$W$1, ( ((@INDEX(EW:EW,$AD${row})-EW${row})/@INDEX(EW:EW,$AD${row}))*-1), ""), "")` }, (item["HT-20MHz | 5GHz"] ? item["HT-20MHz | 5GHz"]["Udp_Rx"]["value"] : ''), worksheet.getCell(`EZ${row}`).value = { formula: `=IFERROR(IF( ABS( ((@INDEX(EY:EY,$AD${row})-EY${row})/@INDEX(EY:EY,$AD${row}))*-1 )>$W$1, ( ((@INDEX(EY:EY,$AD${row})-EY${row})/@INDEX(EY:EY,$AD${row}))*-1), ""), "")` });
                        newRow.push('', (item["HT-40MHz | 2GHz"] ? item["HT-40MHz | 2GHz"]["Tcp_Tx"]["value"] : ''), worksheet.getCell(`FC${row}`).value = { formula: `=IFERROR(IF( ABS( ((@INDEX(FB:FB,$AD${row})-FB${row})/@INDEX(FB:FB,$AD${row}))*-1 )>$W$1, ( ((@INDEX(FB:FB,$AD${row})-FB${row})/@INDEX(FB:FB,$AD${row}))*-1), ""), "")` }, (item["HT-40MHz | 2GHz"] ? item["HT-40MHz | 2GHz"]["Tcp_Rx"]["value"] : ''), worksheet.getCell(`FE${row}`).value = { formula: `=IFERROR(IF( ABS( ((@INDEX(FD:FD,$AD${row})-FD${row})/@INDEX(FD:FD,$AD${row}))*-1 )>$W$1, ( ((@INDEX(FD:FD,$AD${row})-FD${row})/@INDEX(FD:FD,$AD${row}))*-1), ""), "")` }, (item["HT-40MHz | 2GHz"] ? item["HT-40MHz | 2GHz"]["Udp_Tx"]["value"] : ''), worksheet.getCell(`FG${row}`).value = { formula: `=IFERROR(IF( ABS( ((@INDEX(FF:FF,$AD${row})-FF${row})/@INDEX(FF:FF,$AD${row}))*-1 )>$W$1, ( ((@INDEX(FF:FF,$AD${row})-FF${row})/@INDEX(FF:FF,$AD${row}))*-1), ""), "")` }, (item["HT-40MHz | 2GHz"] ? item["HT-40MHz | 2GHz"]["Udp_Rx"]["value"] : ''), worksheet.getCell(`FI${row}`).value = { formula: `=IFERROR(IF( ABS( ((@INDEX(FH:FH,$AD${row})-FH${row})/@INDEX(FH:FH,$AD${row}))*-1 )>$W$1, ( ((@INDEX(FH:FH,$AD${row})-FH${row})/@INDEX(FH:FH,$AD${row}))*-1), ""), "")` });
                        newRow.push('', (item["HT-20MHz | 2GHz"] ? item["HT-20MHz | 2GHz"]["Tcp_Tx"]["value"] : ''), worksheet.getCell(`FL${row}`).value = { formula: `=IFERROR(IF( ABS( ((@INDEX(FK:FK,$AD${row})-FK${row})/@INDEX(FK:FK,$AD${row}))*-1 )>$W$1, ( ((@INDEX(FK:FK,$AD${row})-FK${row})/@INDEX(FK:FK,$AD${row}))*-1), ""), "")` }, (item["HT-20MHz | 2GHz"] ? item["HT-20MHz | 2GHz"]["Tcp_Rx"]["value"] : ''), worksheet.getCell(`FN${row}`).value = { formula: `=IFERROR(IF( ABS( ((@INDEX(FM:FM,$AD${row})-FM${row})/@INDEX(FM:FM,$AD${row}))*-1 )>$W$1, ( ((@INDEX(FM:FM,$AD${row})-FM${row})/@INDEX(FM:FM,$AD${row}))*-1), ""), "")` }, (item["HT-20MHz | 2GHz"] ? item["HT-20MHz | 2GHz"]["Udp_Tx"]["value"] : ''), worksheet.getCell(`FP${row}`).value = { formula: `=IFERROR(IF( ABS( ((@INDEX(FO:FO,$AD${row})-FO${row})/@INDEX(FO:FO,$AD${row}))*-1 )>$W$1, ( ((@INDEX(FO:FO,$AD${row})-FO${row})/@INDEX(FO:FO,$AD${row}))*-1), ""), "")` }, (item["HT-20MHz | 2GHz"] ? item["HT-20MHz | 2GHz"]["Udp_Rx"]["value"] : ''), worksheet.getCell(`FR${row}`).value = { formula: `=IFERROR(IF( ABS( ((@INDEX(FQ:FQ,$AD${row})-FQ${row})/@INDEX(FQ:FQ,$AD${row}))*-1 )>$W$1, ( ((@INDEX(FQ:FQ,$AD${row})-FQ${row})/@INDEX(FQ:FQ,$AD${row}))*-1), ""), "")` });
                        newRow.push('', (item["Non-HT BG | 2GHz"] ? item["Non-HT BG | 2GHz"]["Tcp_Tx"]["value"] : ''), worksheet.getCell(`FU${row}`).value = { formula: `=IFERROR(IF( ABS( ((@INDEX(FT:FT,$AD${row})-FT${row})/@INDEX(FT:FT,$AD${row}))*-1 )>$W$1, ( ((@INDEX(FT:FT,$AD${row})-FT${row})/@INDEX(FT:FT,$AD${row}))*-1), ""), "")` }, (item["Non-HT BG | 2GHz"] ? item["Non-HT BG | 2GHz"]["Tcp_Rx"]["value"] : ''), worksheet.getCell(`FW${row}`).value = { formula: `=IFERROR(IF( ABS( ((@INDEX(FV:FV,$AD${row})-FV${row})/@INDEX(FV:FV,$AD${row}))*-1 )>$W$1, ( ((@INDEX(FV:FV,$AD${row})-FV${row})/@INDEX(FV:FV,$AD${row}))*-1), ""), "")` }, (item["Non-HT BG | 2GHz"] ? item["Non-HT BG | 2GHz"]["Udp_Tx"]["value"] : ''), worksheet.getCell(`FY${row}`).value = { formula: `=IFERROR(IF( ABS( ((@INDEX(FX:FX,$AD${row})-FX${row})/@INDEX(FX:FX,$AD${row}))*-1 )>$W$1, ( ((@INDEX(FX:FX,$AD${row})-FX${row})/@INDEX(FX:FX,$AD${row}))*-1), ""), "")` }, (item["Non-HT BG | 2GHz"] ? item["Non-HT BG | 2GHz"]["Udp_Rx"]["value"] : ''), worksheet.getCell(`GA${row}`).value = { formula: `=IFERROR(IF( ABS( ((@INDEX(FZ:FZ,$AD${row})-FZ${row})/@INDEX(FZ:FZ,$AD${row}))*-1 )>$W$1, ( ((@INDEX(FZ:FZ,$AD${row})-FZ${row})/@INDEX(FZ:FZ,$AD${row}))*-1), ""), "")` });
                        newRow.push('', (item["Non-HT A | 5GHz"] ? item["Non-HT A | 5GHz"]["Tcp_Tx"]["value"] : ''), worksheet.getCell(`GD${row}`).value = { formula: `=IFERROR(IF( ABS( ((@INDEX(GC:GC,$AD${row})-GC${row})/@INDEX(GC:GC,$AD${row}))*-1 )>$W$1, ( ((@INDEX(GC:GC,$AD${row})-GC${row})/@INDEX(GC:GC,$AD${row}))*-1), ""), "")` }, (item["Non-HT A | 5GHz"] ? item["Non-HT A | 5GHz"]["Tcp_Rx"]["value"] : ''), worksheet.getCell(`GF${row}`).value = { formula: `=IFERROR(IF( ABS( ((@INDEX(GE:GE,$AD${row})-GE${row})/@INDEX(GE:GE,$AD${row}))*-1 )>$W$1, ( ((@INDEX(GE:GE,$AD${row})-GE${row})/@INDEX(GE:GE,$AD${row}))*-1), ""), "")` }, (item["Non-HT A | 5GHz"] ? item["Non-HT A | 5GHz"]["Udp_Tx"]["value"] : ''), worksheet.getCell(`GH${row}`).value = { formula: `=IFERROR(IF( ABS( ((@INDEX(GG:GG,$AD${row})-GG${row})/@INDEX(GG:GG,$AD${row}))*-1 )>$W$1, ( ((@INDEX(GG:GG,$AD${row})-GG${row})/@INDEX(GG:GG,$AD${row}))*-1), ""), "")` }, (item["Non-HT A | 5GHz"] ? item["Non-HT A | 5GHz"]["Udp_Rx"]["value"] : ''), worksheet.getCell(`GJ${row}`).value = { formula: `=IFERROR(IF( ABS( ((@INDEX(GI:GI,$AD${row})-GI${row})/@INDEX(GI:GI,$AD${row}))*-1 )>$W$1, ( ((@INDEX(GI:GI,$AD${row})-GI${row})/@INDEX(GI:GI,$AD${row}))*-1), ""), "")` });
                        newRow.push('', (item["Non-HT B-Only | 2GHz"] ? item["Non-HT B-Only | 2GHz"]["Tcp_Tx"]["value"] : ''), worksheet.getCell(`GM${row}`).value = { formula: `=IFERROR(IF( ABS( ((@INDEX(GL:GL,$AD${row})-GL${row})/@INDEX(GL:GL,$AD${row}))*-1 )>$W$1, ( ((@INDEX(GL:GL,$AD${row})-GL${row})/@INDEX(GL:GL,$AD${row}))*-1), ""), "")` }, (item["Non-HT B-Only | 2GHz"] ? item["Non-HT B-Only | 2GHz"]["Tcp_Rx"]["value"] : ''), worksheet.getCell(`GO${row}`).value = { formula: `=IFERROR(IF( ABS( ((@INDEX(GN:GN,$AD${row})-GN${row})/@INDEX(GN:GN,$AD${row}))*-1 )>$W$1, ( ((@INDEX(GN:GN,$AD${row})-GN${row})/@INDEX(GN:GN,$AD${row}))*-1), ""), "")` }, (item["Non-HT B-Only | 2GHz"] ? item["Non-HT B-Only | 2GHz"]["Udp_Tx"]["value"] : ''), worksheet.getCell(`GQ${row}`).value = { formula: `=IFERROR(IF( ABS( ((@INDEX(GP:GP,$AD${row})-GP${row})/@INDEX(GP:GP,$AD${row}))*-1 )>$W$1, ( ((@INDEX(GP:GP,$AD${row})-GP${row})/@INDEX(GP:GP,$AD${row}))*-1), ""), "")` }, (item["Non-HT B-Only | 2GHz"] ? item["Non-HT B-Only | 2GHz"]["Udp_Rx"]["value"] : ''), worksheet.getCell(`GS${row}`).value = { formula: `=IFERROR(IF( ABS( ((@INDEX(GR:GR,$AD${row})-GR${row})/@INDEX(GR:GR,$AD${row}))*-1 )>$W$1, ( ((@INDEX(GR:GR,$AD${row})-GR${row})/@INDEX(GR:GR,$AD${row}))*-1), ""), "")` });

                        // startRow = worksheet.addRow(newRow, 'i');
                        startRow = worksheet.getRow(row_num);
                        for (let index = 0; index < newRow.length; index++) {
                            startRow.getCell(index + 1).value = newRow[index];
                            // startRow.commit();
                        }
                        // console.log('isBenchmark --', item["isBenchmark"])
                        // console.log('benchmark_label --', item["benchmark_label"])
                        // console.log("row_inside --", row_num);
                        row_num += 1;
                        row++
                    }
                    console.log("execution 1 completed");
                    console.log("row_num--", row_num);
                    // startRow = worksheet.addRow('', 'i');
                    let emptyRow = worksheet.getRow(15);

                    // for (let index = 0; index < newRow.length; index++) {
                    //     emptyRow.getCell("A15").fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'CCCCCCCC' } };
                    //     // startRow.commit();
                    // }

                    row_num += 1;
                    row++

                })
            });
        await workbook.xlsx.writeFile(file); // xlsx format generated from the above template
        return file;
    } catch (err) {
        logger.error("generateTPCompareReport : ", err);
    }
}


/*
    Creates a new xlsx excel workbook from the existing WLAN RvR template for given RvR execution.
*/
async function generateWlanRvrReport(data, executionName) {
    try {
        let templateFile = config.public.path + config.public.templates + "WLAN_RvR_TestReport_template.xlsx";
        let file = config.public.path + config.public.output + executionName + '_WLAN_RvR_Report.xlsx';

        await XlsxPopulate.fromFileAsync(templateFile)
            .then(workbook => {
                let worksheet = workbook.sheet("RvR"); // get particular sheet
                const usedRange = worksheet.usedRange();
                const values = usedRange.value();
                let row_num = 53;
                let startRow;
                let rowName;
                let ifStatus = 0;
                // let attenVal = [];

                let attenColumnVal = values[51]; // table header to fetch attenuation values
                let attenColumns = _.filter(attenColumnVal, function(atten) {
                    if (typeof(atten) === 'number') {
                        return atten;
                    }
                });
                console.log("atten in header--", attenColumns);

                _.each(data, function(result) {
                    let attenuationVal = (Object.keys(result[0]));
                    let attenVal = [];
                    _.forEach(attenuationVal, function(val) {
                        if (val.match('^[0-9]*$')) {
                            attenVal.push(Number(val.match('^[0-9]*$')[0]));
                        }
                    });
                    console.log("atten in data--", attenVal);

                    rowName = '';
                    if (result[0].isBenchmark == true) {
                        if (ifStatus == 0) {
                            rowName = 'Benchmark'; // + result[0].benchmark_label;
                            //rowName = result[0].benchmark_label;
                            ifStatus = 1;
                        } else {
                            rowName = result[0].execution_name;
                        }
                    } else {
                        rowName = result[0].execution_name;
                    }
                    //console.log('rowName --', rowName);
                    console.log('row_num --', row_num);

                    startRow = worksheet.row(row_num).cell(1).value(rowName);
                    startRow = worksheet.row(row_num).cell(1).style({ bold: true, fontColor: 'FFFFFF', fill: { type: "solid", color: "262626" } });

                    _.each(result, function(item) {
                        /* Static column values for TP KPI data */
                        let newRow = [];
                        newRow.push(item["TP TYPE"], item["DUT"], item["SoC Version"], item["SoC TYPE"], item["DUT Fw/Drv"],
                            item["Interface"], item["Aggregation"], item["Spatial Streams"], item["Guard Interval"], item["Data Rate"],
                            item["Channel | 2 GHz"], item["Channel | 5 GHz"], item["SDIO Clock"], item["Companion Device/Ex-AP/Ex-STA/Ex-P2P-GO/Ex-P2P-GC"], item["Companion Device FW/Drv"],
                            item["DUT Host Platform"], item["DUT OS"], item["Security"], item["DUT Mode"], item["DUT Protocol"]);

                        _.each(attenColumns, function(element) {
                            if (_.contains(attenVal, element)) {
                                newRow.push((item[element] ? Number(item[element]) : ''));
                            } else {
                                newRow.push('');
                            }
                        });

                        startRow = worksheet.row(row_num);

                        for (let index = 0; index < newRow.length; index++) {
                            startRow.cell(index + 4).value(newRow[index]);
                        }

                        startRow.cell(93).value(item["Comments"]);
                        startRow.cell(94).value(item["Test Repetition"]);

                        row_num += 1;
                    });
                    row_num += 1;
                });
                return workbook.toFileAsync(file); // xlsx format generated from the above template
            })
        console.log("file return- ", file);
        return file;
    } catch (err) {
        logger.error("generateWlanRvrReport : ", err);
    }
}


/*
    Creates a new xlsx excel workbook from the existing WLAN RvR template for given RvR execution.
*/
async function functionalityReport(data, exeNames) {
    try {
        const workbook = new ExcelJS.Workbook(); // creates a new workbook
        let templateFile = config.public.path + config.public.templates + "Functionality_Template.xlsx";
        let file = config.public.path + config.public.output + Date.now() + 'Functionality_Report.xlsx';

        await workbook.xlsx.readFile(templateFile)
            .then(async function() {
                let worksheet = workbook.getWorksheet("Pass_Fail_Result"); // get particular sheet
                let row_num = 3;
                let startRow = worksheet.getRow(row_num);

                let headerRow = worksheet.getRow(2);
                let headers = ['test_no', 'test_case'];
                let cellNum = 3;
                _.each(exeNames, function(name) {
                    console.log("name", name);
                    headers.push(name.id);
                    headerRow.getCell(cellNum).value = name.name;
                    cellNum++;
                    headerRow.getCell(cellNum).value = "Comments";
                    cellNum++;
                });

                console.log("headers", headers);
                for (let item of data) {
                    let newRow = [];
                    startRow = worksheet.getRow(row_num);
                    _.each(headers, function(h) {
                        if (_.contains(Object.keys(item), h)) {
                            if (h == 'test_no' || h == 'test_case') {
                                newRow.push(item[h]);
                            } else {
                                newRow.push(item[h].status, item[h].comments);
                            }
                        } else {
                            newRow.push('-', '-');
                        }
                    });
                    for (let index = 0; index < newRow.length; index++) {
                        startRow.getCell(index + 1).value = newRow[index];
                    }
                    row_num += 1;
                }
                await workbook.xlsx.writeFile(file); // xlsx format generated from the above template
                console.log("file - ", file);
            });
        console.log("file return- ", file);
        return file;
    } catch (err) {
        logger.error("functionalityReport : ", err);
    }
}

async function generateWlanRvrMergedReport(data, executionName) {
    try {
        let templateFile = config.public.path + config.public.templates + "WLAN_RvR_TestReport_template.xlsx";
        let file = config.public.path + config.public.output + executionName + '_WLAN_RvR_Report.xlsx';

        await XlsxPopulate.fromFileAsync(templateFile)
            .then(workbook => {
                let worksheet = workbook.sheet("RvR"); // get particular sheet
                const usedRange = worksheet.usedRange();
                const values = usedRange.value();
                let row_num = 53;
                let startRow;
                // let attenVal = [];

                let attenColumnVal = values[51]; // table header to fetch attenuation values
                let attenColumns = _.filter(attenColumnVal, function(atten) {
                    if (typeof(atten) === 'number') {
                        return atten;
                    }
                });
                console.log("atten in header--", attenColumns);

                _.each(data, function(result) {
                    let attenuationVal = (Object.keys(result[0]));
                    let attenVal = [];
                    _.forEach(attenuationVal, function(val) {
                        if (val.match('^[0-9]*$')) {
                            attenVal.push(Number(val.match('^[0-9]*$')[0]));
                        }
                    });
                    console.log("atten in data--", attenVal);

                    startRow = worksheet.row(row_num).cell(1).value(result[0].execution_name);
                    startRow = worksheet.row(row_num).cell(1).style({ bold: true, fontColor: 'FFFFFF', fill: { type: "solid", color: "262626" } });

                    _.each(result, function(item) {
                        /* Static column values for TP KPI data */
                        let newRow = [];
                        newRow.push(item["TP TYPE"], item["DUT"], item["SoC Version"], item["SoC TYPE"], item["DUT Fw/Drv"],
                            item["Interface"], item["Aggregation"], item["Spatial Streams"], item["Guard Interval"], item["Data Rate"],
                            item["Channel | 2 GHz"], item["Channel | 5 GHz"], item["SDIO Clock"], item["Companion Device/Ex-AP/Ex-STA/Ex-P2P-GO/Ex-P2P-GC"], item["Companion Device FW/Drv"],
                            item["DUT Host Platform"], item["DUT OS"], item["Security"], item["DUT Mode"], item["DUT Protocol"]);

                        _.each(attenColumns, function(element) {
                            if (_.contains(attenVal, element)) {
                                newRow.push(item[element][0]);
                            } else {
                                newRow.push('');
                            }
                        });

                        startRow = worksheet.row(row_num);
                        for (let index = 0; index < newRow.length; index++) {
                            startRow.cell(index + 4).value(newRow[index]);
                        }

                        startRow.cell(93).value(item["Comments"]);
                        startRow.cell(94).value(item["Test Repetition"]);

                        row_num += 1;
                    });
                    row_num += 1;
                });
                return workbook.toFileAsync(file); // xlsx format generated from the above template
            })
        console.log("file return- ", file);
        return file;
    } catch (err) {
        logger.error("generateWlanRvrMergedReport : ", err);
    }
}


/*
    This method generates an xlsx file for the specified execution with its results amd summary.
*/
routes.prototype.generateOutputFile = async function(req, res) {
    let responseObject = {
        status: true,
        data: {}
    };

    try {
        let summary = await generateSummary(); // generate summary sheet

        let result = await executionObj.getExecutionResults(1); // get the records for execution results

        let suiteNames = [...new Set(result.map(item => item.test_suite_name))]; // get the testsuite names 

        await generateSuites(summary, suiteNames, result); // generate the sheets with execution results testsuite wise

        res.json(responseObject);
        // res.download('./public/Output/export.xlsx');

    } catch (err) {
        logger.error("generateOutputFile : ", err);
        responseError(res, responseObject, "Failed to generate the output file");
    }
}

/*
    Creates a new xlsx excel workbook from the existing Unified KPI template for given TP-2INTF execution.
*/
async function generate2IntfReport(data, executionName) {
    try {
        const workbook = new ExcelJS.Workbook(); // creates a new workbook
        let templateFile = config.public.path + config.public.templates + "WLAN_Simul-TP-2INTF.xlsx";
        let file = config.public.path + config.public.output + executionName + 'KPI_Report.xlsx';

        await workbook.xlsx.readFile(templateFile)
            .then(async function() {
                let worksheet = workbook.getWorksheet("WLAN_Simul-TP-2INTF"); // get particular sheet
                let row_num = 8;
                let startRow = worksheet.getRow(row_num);
                let slVal = 1;
                for (let item of data) {
                    let newRow = ['', '', slVal];
                    worksheet.getRow(8).getCell(1).value = executionName;

                    /* Static column values for TP-2INTF KPI data */
                    newRow.push(item["TP TYPE"], item["DUT"], item["SoC Version"], item["SoC TYPE"], item["DUT Fw/Drv"],
                        item["Interface"], item["SDIO Clock"], item["Aggregation"], item["Spatial Streams"], item["Guard_Interval"],
                        item["Data Rate"], item["Connectivity Modes"], item['Companion Device1/Ex-AP/Ex-STA/Ex-P2P-GO/Ex-P2P-GC'], item['Companion Device1 FW/Drv'], item['Companion Device2/Ex-AP/Ex-STA/Ex-P2P-GO/Ex-P2P-GC'], item['Companion Device2 FW/Drv'], item["DUT Host Platform"], item['DUT OS'], item["INTF1 Configuration"],
                        item["Channel | INTF 1"], item["INTF2 Configuration"], item["Channel | INTF 2"], item['DRCS Timing Configuration Duty Cycle | INTF1 | INTF2'], item['Misc'], item["Security"], item['Test Repetition']);

                    /* Band Mapped column values for TP-2INTF KPI data */
                    newRow.push('', (item["TCP"] ? item["TCP"]["TXTX"]["INTF1"] : ''), (item["TCP"] ? item["TCP"]["TXTX"]["INTF2"] : ''), '', (item["TCP"] ? item["TCP"]["TXRX"]["INTF1"] : ''), (item["TCP"] ? item["TCP"]["TXRX"]["INTF2"] : ''), '', (item["TCP"] ? item["TCP"]["RXTX"]["INTF1"] : ''), (item["TCP"] ? item["TCP"]["RXTX"]["INTF2"] : ''), '', (item["TCP"] ? item["TCP"]["RXRX"]["INTF1"] : ''), (item["TCP"] ? item["TCP"]["RXRX"]["INTF2"] : ''));
                    newRow.push('', (item["UDP"] ? item["UDP"]["TXTX"]["INTF1"] : ''), (item["UDP"] ? item["UDP"]["TXTX"]["INTF2"] : ''), '', (item["UDP"] ? item["UDP"]["TXRX"]["INTF1"] : ''), (item["UDP"] ? item["UDP"]["TXRX"]["INTF2"] : ''), '', (item["UDP"] ? item["UDP"]["RXTX"]["INTF1"] : ''), (item["UDP"] ? item["UDP"]["RXTX"]["INTF2"] : ''), '', (item["UDP"] ? item["UDP"]["RXRX"]["INTF1"] : ''), (item["UDP"] ? item["UDP"]["RXRX"]["INTF2"] : ''), '');

                    startRow = worksheet.getRow(row_num);
                    for (let index = 0; index < newRow.length; index++) {
                        startRow.getCell(index + 1).value = newRow[index];
                    }
                    row_num += 1;
                    slVal += 1;
                }
                await workbook.xlsx.writeFile(file); // xlsx format generated from the above template
                console.log("file - ", file);
            });
        console.log("file return- ", file);
        return file;
    } catch (err) {
        logger.error("generate2IntfReport : ", err);
    }
}

/*
    Creates a new xlsx excel workbook from the existing Unified KPI template for given TP-3INTF execution.
*/
async function generate3IntfReport(data, executionName) {
    try {
        const workbook = new ExcelJS.Workbook(); // creates a new workbook
        let templateFile = config.public.path + config.public.templates + "WLAN_Simul-TP-3INTF.xlsx";
        let file = config.public.path + config.public.output + executionName + 'KPI_Report.xlsx';

        await workbook.xlsx.readFile(templateFile)
            .then(async function() {
                let worksheet = workbook.getWorksheet("WLAN_Simul-TP-3INTF"); // get particular sheet
                let row_num = 8;
                let startRow = worksheet.getRow(row_num);
                let slVal = 1;

                for (let item of data) {
                    let newRow = ['', '', slVal];
                    worksheet.getRow(8).getCell(1).value = executionName;

                    /* Static column values for TP-3INTF KPI data */
                    newRow.push(item["TP TYPE"], item["DUT"], item["SoC Version"], item["SoC TYPE"], item["DUT Fw/Drv"],
                        item["Interface"], item["SDIO Clock"], item["Aggregation"], item["Spatial Streams"], item["Guard_Interval"],
                        item["Data Rate"], item["Connectivity Modes"], item['Companion Device1/Ex-AP/Ex-STA/Ex-P2P-GO/Ex-P2P-GC'], item['Companion Device1 FW/Drv'], item['Companion Device2/Ex-AP/Ex-STA/Ex-P2P-GO/Ex-P2P-GC'],
                        item['Companion Device2 FW/Drv'], item['Companion Device3/Ex-AP/Ex-STA/Ex-P2P-GO/Ex-P2P-GC'], item['Companion Device3 FW/Drv'], item["DUT Host Platform"], item['DUT OS'], item["INTF1 Configuration"],
                        item["Channel | INTF 1"], item["INTF2 Configuration"], item["Channel | INTF 2"], item["INTF3 Configuration"],
                        item["Channel | INTF 3"], item['DRCS Timing Configuration Duty Cycle | INTF1 | INTF2'], item['Misc'], item["Security"], item['Test Repetition']);

                    /* Band Mapped column values for TP-3INTF KPI data */
                    newRow.push('',
                        (item["TCP"]["TXTXTX"] ? item["TCP"]["TXTXTX"]["INTF1"] : ''),
                        (item["TCP"]["TXTXTX"] ? item["TCP"]["TXTXTX"]["INTF2"] : ''),
                        (item["TCP"]["TXTXTX"] ? item["TCP"]["TXTXTX"]["INTF3"] : ''),
                        '',
                        (item["TCP"]["TXTXRX"] ? item["TCP"]["TXTXRX"]["INTF1"] : ''),
                        (item["TCP"]["TXTXRX"] ? item["TCP"]["TXTXRX"]["INTF2"] : ''),
                        (item["TCP"]["TXTXRX"] ? item["TCP"]["TXTXRX"]["INTF3"] : ''),
                        '',
                        (item["TCP"]["TXRXTX"] ? item["TCP"]["TXRXTX"]["INTF1"] : ''),
                        (item["TCP"]["TXRXTX"] ? item["TCP"]["TXRXTX"]["INTF2"] : ''),
                        (item["TCP"]["TXRXTX"] ? item["TCP"]["TXRXTX"]["INTF3"] : ''),
                        '',
                        (item["TCP"]["TXRXRX"] ? item["TCP"]["TXRXRX"]["INTF1"] : ''),
                        (item["TCP"]["TXRXRX"] ? item["TCP"]["TXRXRX"]["INTF2"] : ''),
                        (item["TCP"]["TXRXRX"] ? item["TCP"]["TXRXRX"]["INTF3"] : ''),
                        '',
                        (item["TCP"]["RXTXTX"] ? item["TCP"]["RXTXTX"]["INTF1"] : ''),
                        (item["TCP"]["RXTXTX"] ? item["TCP"]["RXTXTX"]["INTF2"] : ''),
                        (item["TCP"]["RXTXTX"] ? item["TCP"]["RXTXTX"]["INTF3"] : ''),
                        '',
                        (item["TCP"]["RXTXRX"] ? item["TCP"]["RXTXRX"]["INTF1"] : ''),
                        (item["TCP"]["RXTXRX"] ? item["TCP"]["RXTXRX"]["INTF2"] : ''),
                        (item["TCP"]["RXTXRX"] ? item["TCP"]["RXTXRX"]["INTF3"] : ''),
                        '',
                        (item["TCP"]["RXRXTX"] ? item["TCP"]["RXRXTX"]["INTF1"] : ''),
                        (item["TCP"]["RXRXTX"] ? item["TCP"]["RXRXTX"]["INTF2"] : ''),
                        (item["TCP"]["RXRXTX"] ? item["TCP"]["RXRXTX"]["INTF3"] : ''),
                        '',
                        (item["TCP"]["RXRXRX"] ? item["TCP"]["RXRXRX"]["INTF1"] : ''),
                        (item["TCP"]["RXRXRX"] ? item["TCP"]["RXRXRX"]["INTF2"] : ''),
                        (item["TCP"]["RXRXRX"] ? item["TCP"]["RXRXRX"]["INTF3"] : ''));

                    newRow.push('',
                        (item["UDP"]["TXTXTX"] ? item["UDP"]["TXTXTX"]["INTF1"] : ''),
                        (item["UDP"]["TXTXTX"] ? item["UDP"]["TXTXTX"]["INTF2"] : ''),
                        (item["UDP"]["TXTXTX"] ? item["UDP"]["TXTXTX"]["INTF3"] : ''),
                        '',
                        (item["UDP"]["TXTXRX"] ? item["UDP"]["TXTXRX"]["INTF1"] : ''),
                        (item["UDP"]["TXTXRX"] ? item["UDP"]["TXTXRX"]["INTF2"] : ''),
                        (item["UDP"]["TXTXRX"] ? item["UDP"]["TXTXRX"]["INTF3"] : ''),
                        '',
                        (item["UDP"]["TXRXTX"] ? item["UDP"]["TXRXTX"]["INTF1"] : ''),
                        (item["UDP"]["TXRXTX"] ? item["UDP"]["TXRXTX"]["INTF2"] : ''),
                        (item["UDP"]["TXRXTX"] ? item["UDP"]["TXRXTX"]["INTF3"] : ''),
                        '',
                        (item["UDP"]["TXRXRX"] ? item["UDP"]["TXRXRX"]["INTF1"] : ''),
                        (item["UDP"]["TXRXRX"] ? item["UDP"]["TXRXRX"]["INTF2"] : ''),
                        (item["UDP"]["TXRXRX"] ? item["UDP"]["TXRXRX"]["INTF3"] : ''),
                        '',
                        (item["UDP"]["RXTXTX"] ? item["UDP"]["RXTXTX"]["INTF1"] : ''),
                        (item["UDP"]["RXTXTX"] ? item["UDP"]["RXTXTX"]["INTF2"] : ''),
                        (item["UDP"]["RXTXTX"] ? item["UDP"]["RXTXTX"]["INTF3"] : ''),
                        '',
                        (item["UDP"]["RXTXRX"] ? item["UDP"]["RXTXRX"]["INTF1"] : ''),
                        (item["UDP"]["RXTXRX"] ? item["UDP"]["RXTXRX"]["INTF2"] : ''),
                        (item["UDP"]["RXTXRX"] ? item["UDP"]["RXTXRX"]["INTF3"] : ''),
                        '',
                        (item["UDP"]["RXRXTX"] ? item["UDP"]["RXRXTX"]["INTF1"] : ''),
                        (item["UDP"]["RXRXTX"] ? item["UDP"]["RXRXTX"]["INTF2"] : ''),
                        (item["UDP"]["RXRXTX"] ? item["UDP"]["RXRXTX"]["INTF3"] : ''),
                        '',
                        (item["UDP"]["RXRXRX"] ? item["UDP"]["RXRXRX"]["INTF1"] : ''),
                        (item["UDP"]["RXRXRX"] ? item["UDP"]["RXRXRX"]["INTF2"] : ''),
                        (item["UDP"]["RXRXRX"] ? item["UDP"]["RXRXRX"]["INTF3"] : ''));

                    startRow = worksheet.getRow(row_num);
                    for (let index = 0; index < newRow.length; index++) {
                        startRow.getCell(index + 1).value = newRow[index];
                    }
                    row_num += 1;
                    slVal += 1;
                }
                await workbook.xlsx.writeFile(file); // xlsx format generated from the above template
                console.log("file - ", file);
            });
        console.log("file return- ", file);
        return file;
    } catch (err) {
        logger.error("generate3IntfReport : ", err);
    }
}

/*
    Creates a new xlsx excel workbook from the existing Unified KPI template for given TP-4INTF execution.
*/
async function generate4IntfReport(data, executionName) {
    try {
        const workbook = new ExcelJS.Workbook(); // creates a new workbook
        let templateFile = config.public.path + config.public.templates + "Four_Interface_Template.xlsx";
        let file = config.public.path + config.public.output + executionName + 'KPI_Report.xlsx';

        await workbook.xlsx.readFile(templateFile)
            .then(async function() {
                let worksheet = workbook.getWorksheet("TP-4INTF"); // get particular sheet
                let row_num = 8;
                let startRow = worksheet.getRow(row_num);

                for (let item of data) {
                    let newRow = ['', '', ''];
                    worksheet.getRow(8).getCell(1).value = executionName;

                    /* Static column values for TP-4INTF KPI data */
                    newRow.push(item["TP TYPE"], item["DUT"], item["SoC Version"], item["SoC TYPE"], item["DUT Fw/Drv"],
                        item["Interface"], item["SDIO Clock"], item["Aggregation"], item["Spatial Streams"], item["Guard_Interval"],
                        item["Data Rate"], item["Connectivity Modes"], item['Companion Device1/Ex-AP/Ex-STA/Ex-P2P-GO/Ex-P2P-GC'], item['Companion Device1 FW/Drv'], item['Companion Device2/Ex-AP/Ex-STA/Ex-P2P-GO/Ex-P2P-GC'],
                        item['Companion Device2 FW/Drv'], item['Companion Device3/Ex-AP/Ex-STA/Ex-P2P-GO/Ex-P2P-GC'], item['Companion Device3 FW/Drv'],
                        item['Companion Device4/Ex-AP/Ex-STA/Ex-P2P-GO/Ex-P2P-GC'], item['Companion Device4 FW/Drv'], item["DUT Host Platform"], item['DUT OS'], item["INTF1 Configuration"],
                        item["Channel | INTF 1"], item["INTF2 Configuration"], item["Channel | INTF 2"], item["INTF3 Configuration"], item["Channel | INTF 3"],
                        item["INTF4 Configuration"], item["Channel | INTF 4"], item['DRCS Timing Configuration Duty Cycle | INTF1 | INTF2'], item['Misc'], item["Security"], item['Test Repetition']);

                    /* Band Mapped column values for TP-4INTF KPI data */
                    newRow.push('', (item["TCP"] ? item["TCP"]["TXTXTXTX"]["INTF1"] : ''), (item["TCP"] ? item["TCP"]["TXTXTXTX"]["INTF2"] : ''), (item["TCP"] ? item["TCP"]["TXTXTXTX"]["INTF3"] : ''), (item["TCP"] ? item["TCP"]["TXTXTXTX"]["INTF4"] : ''),
                        '', (item["TCP"] ? item["TCP"]["TXTXTXRX"]["INTF1"] : ''), (item["TCP"] ? item["TCP"]["TXTXTXRX"]["INTF2"] : ''), (item["TCP"] ? item["TCP"]["TXTXTXRX"]["INTF3"] : ''), (item["TCP"] ? item["TCP"]["TXTXTXRX"]["INTF4"] : ''),
                        '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', (item["TCP"] ? item["TCP"]["TXRXTXRX"]["INTF1"] : ''), (item["TCP"] ? item["TCP"]["TXRXTXRX"]["INTF2"] : ''), (item["TCP"] ? item["TCP"]["TXRXTXRX"]["INTF3"] : ''),
                        (item["TCP"] ? item["TCP"]["TXRXTXRX"]["INTF4"] : ''), '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '',
                        (item["TCP"] ? item["TCP"]["RXRXRXRX"]["INTF1"] : ''), (item["TCP"] ? item["TCP"]["RXRXRXRX"]["INTF2"] : ''), (item["TCP"] ? item["TCP"]["RXRXRXRX"]["INTF3"] : ''), (item["TCP"] ? item["TCP"]["RXRXRXRX"]["INTF4"] : ''));
                    newRow.push('', (item["UDP"] ? item["UDP"]["TXTXTXTX"]["INTF1"] : ''), (item["UDP"] ? item["UDP"]["TXTXTXTX"]["INTF2"] : ''), (item["UDP"] ? item["UDP"]["TXTXTXTX"]["INTF3"] : ''), (item["UDP"] ? item["UDP"]["TXTXTXTX"]["INTF4"] : ''),
                        '', (item["UDP"] ? item["UDP"]["TXTXTXRX"]["INTF1"] : ''), (item["UDP"] ? item["UDP"]["TXTXTXRX"]["INTF2"] : ''), (item["UDP"] ? item["UDP"]["TXTXTXRX"]["INTF3"] : ''), (item["UDP"] ? item["UDP"]["TXTXTXRX"]["INTF4"] : ''),
                        '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', (item["UDP"] ? item["UDP"]["TXRXTXRX"]["INTF1"] : ''), (item["UDP"] ? item["UDP"]["TXRXTXRX"]["INTF2"] : ''), (item["UDP"] ? item["UDP"]["TXRXTXRX"]["INTF3"] : ''),
                        (item["UDP"] ? item["UDP"]["TXRXTXRX"]["INTF4"] : ''), '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '',
                        (item["UDP"] ? item["UDP"]["RXRXRXRX"]["INTF1"] : ''), (item["UDP"] ? item["UDP"]["RXRXRXRX"]["INTF2"] : ''), (item["UDP"] ? item["UDP"]["RXRXRXRX"]["INTF3"] : ''), (item["UDP"] ? item["UDP"]["RXRXRXRX"]["INTF4"] : ''));

                    startRow = worksheet.getRow(row_num);
                    for (let index = 0; index < newRow.length; index++) {
                        startRow.getCell(index + 1).value = newRow[index];
                    }
                    row_num += 1;
                }
                await workbook.xlsx.writeFile(file); // xlsx format generated from the above template
                console.log("file - ", file);
            });
        console.log("file return- ", file);
        return file;
    } catch (err) {
        logger.error("generate4IntfReport : ", err);
    }
}

/*
    Creates a new xlsx excel workbook from the existing Unified KPI template for given DL-11ac-MU-MIMO execution.
*/
async function generateDL11acReport(data, executionName) {
    try {
        const workbook = new ExcelJS.Workbook(); // creates a new workbook
        let templateFile = config.public.path + config.public.templates + "DL-11ac-MU-MIMO_TP.xlsx";
        let file = config.public.path + config.public.output + executionName + '_DL-ac-KPI_Report.xlsx';

        await workbook.xlsx.readFile(templateFile)
            .then(async function() {
                let worksheet = workbook.getWorksheet("DL-11ac-MU-MIMO TP"); // get particular sheet
                let row_num = 2;
                let startRow = worksheet.getRow(row_num);
                // worksheet.getRow(row_num - 1).getCell(1).value = executionName;

                console.log("data--", data);

                for (let item of data) {
                    let newRow = [];

                    /* Static column values for TP-4INTF KPI data */
                    newRow.push(item["FW/Driver ver"], item["AP-Model"], item["MU Config"], item["STA1"], item["STA2"],
                        item["STA1 ANT"], item["STA2 ANT"], item["STA3 ANT"], item["STA4 ANT"], item["No of clients"],
                        item["MU Groups"], item["Band"], item["Mode/BW"], item["MCS Rates"],
                        item["MU UDP AP->STA1"] ? item["MU UDP AP->STA1"] : '', item["MU UDP AP->STA2"] ? item["MU UDP AP->STA2"] : '', item["MU UDP AP->STA3"] ? item["MU UDP AP->STA3"] : '', item["MU UDP AP->STA4"] ? item["MU UDP AP->STA4"] : '',
                        item["MU UDP"] ? item["MU UDP"] : '', item["Expected UDP MUMIMO"], item["SU UDP AP->STA1"] ? item["SU UDP AP->STA1"] : '', item["SU UDP AP->STA2"] ? item["SU UDP AP->STA2"] : '', item["SU UDP AP->STA3"] ? item["SU UDP AP->STA3"] : '', item["SU UDP AP->STA4"] ? item["SU UDP AP->STA4"] : '', item["SU UDP"] ? item["SU UDP"] : '',
                        item["UDP MUvsSU gain"], item["MU TCP AP->STA1"] ? item["MU TCP AP->STA1"] : '', item["MU TCP AP->STA2"] ? item["MU TCP AP->STA2"] : '', item["MU TCP AP->STA3"] ? item["MU TCP AP->STA3"] : '', item["MU TCP AP->STA4"] ? item["MU TCP AP->STA4"] : '', item["MU TCP"] ? item["MU TCP"] : '', item["Expected TCP MUMIMO"],
                        item["SU TCP AP->STA1"] ? item["SU TCP AP->STA1"] : '', item["SU TCP AP->STA2"] ? item["SU TCP AP->STA2"] : '', item["SU TCP AP->STA3"] ? item["SU TCP AP->STA3"] : '', item["SU TCP AP->STA4"] ? item["SU TCP AP->STA4"] : '', item["SU TCP"] ? item["SU TCP"] : '', item["TCP MUvsSU gain"], item["STA3"], item["STA4"], item["Environment"],
                        item["MIMO Cache"], item["Pvt build"], item["AP-SoC Rev"], item["traffic Tool"], item["Channel"], item["SGI/LGI"],
                        item["Security"], item["Date tested"], item["Total Duration"], item["Comments"]);


                    startRow = worksheet.getRow(row_num);
                    for (let index = 0; index < newRow.length; index++) {
                        startRow.getCell(index + 1).value = newRow[index];
                    }
                    row_num += 1;
                }
                await workbook.xlsx.writeFile(file); // xlsx format generated from the above template
                console.log("file - ", file);
            });
        console.log("file return- ", file);
        return file;
    } catch (err) {
        logger.error("generateDL11acReport : ", err);
    }
}

/*
    Creates a new xlsx excel workbook from the existing Unified KPI template for given DL-11ax-MU-MIMO execution.
*/
async function generateDL11axReport(data, executionName) {
    try {
        const workbook = new ExcelJS.Workbook(); // creates a new workbook
        let templateFile = config.public.path + config.public.templates + "DL-11ax-MU-MIMO_TP.xlsx";
        let file = config.public.path + config.public.output + executionName + '_DL-ax-KPI_Report.xlsx';

        await workbook.xlsx.readFile(templateFile)
            .then(async function() {
                let worksheet = workbook.getWorksheet("DL-11ax-MU-MIMO TP"); // get particular sheet
                let row_num = 2;
                let startRow = worksheet.getRow(row_num);
                // worksheet.getRow(row_num - 1).getCell(1).value = executionName;

                console.log("data--", data);

                for (let item of data) {
                    let newRow = [];

                    /* Static column values for TP-4INTF KPI data */
                    newRow.push(item["FW/Driver ver"], item["AP-Model"], item["MU Config"], item["STA1"], item["STA2"],
                        item["STA1 ANT"], item["STA2 ANT"], item["STA3 ANT"], item["STA4 ANT"], item["Num of client"],
                        item["MU Groups"], item["Band"], item["Mode/BW"], item["MCS Rates"],
                        item["MU UDP AP->STA1"] ? item["MU UDP AP->STA1"] : '', item["MU UDP AP->STA2"] ? item["MU UDP AP->STA2"] : '', item["MU UDP AP->STA3"] ? item["MU UDP AP->STA3"] : '', item["MU UDP AP->STA4"] ? item["MU UDP AP->STA4"] : '',
                        item["MU UDP"] ? item["MU UDP"] : '', item["Expected UDP MUMIMO"], item["SU UDP AP->STA1"] ? item["SU UDP AP->STA1"] : '', item["SU UDP AP->STA2"] ? item["SU UDP AP->STA2"] : '', item["SU UDP AP->STA3"] ? item["SU UDP AP->STA3"] : '', item["SU UDP AP->STA4"] ? item["SU UDP AP->STA4"] : '', item["SU UDP"] ? item["SU UDP"] : '',
                        item["UDP MUvsSU gain"], item["MU TCP AP->STA1"] ? item["MU TCP AP->STA1"] : '', item["MU TCP AP->STA2"] ? item["MU TCP AP->STA2"] : '', item["MU TCP AP->STA3"] ? item["MU TCP AP->STA3"] : '', item["MU TCP AP->STA4"] ? item["MU TCP AP->STA4"] : '', item["MU TCP"] ? item["MU TCP"] : '', item["Expected TCP MUMIMO"],
                        item["SU TCP AP->STA1"] ? item["SU TCP AP->STA1"] : '', item["SU TCP AP->STA2"] ? item["SU TCP AP->STA2"] : '', item["SU TCP AP->STA3"] ? item["SU TCP AP->STA3"] : '', item["SU TCP AP->STA4"] ? item["SU TCP AP->STA4"] : '', item["SU TCP"] ? item["SU TCP"] : '', item["TCP MUvsSU gain"], item["STA3"], item["STA4"], item["Environment"],
                        item["MIMO Cache"], item["Pvt build"], item["AP-SoC Rev"], item["traffic Tool"], item["Channel"], item["SGI/LGI"],
                        item["Security"], item["Date tested"], item["Total Duration"], item["Comments"]);


                    startRow = worksheet.getRow(row_num);
                    for (let index = 0; index < newRow.length; index++) {
                        startRow.getCell(index + 1).value = newRow[index];
                    }
                    row_num += 1;
                }
                await workbook.xlsx.writeFile(file); // xlsx format generated from the above template
                console.log("file - ", file);
            });
        console.log("file return- ", file);
        return file;
    } catch (err) {
        logger.error("generateDL11axReport : ", err);
    }
}

/*
    Creates a new xlsx excel workbook from the existing Unified KPI template for given UL-11ax-MU-MIMO execution.
*/
async function generateUL11axReport(data, executionName) {
    try {
        const workbook = new ExcelJS.Workbook(); // creates a new workbook
        let templateFile = config.public.path + config.public.templates + "UL-11ax-MU-MIMO_TP.xlsx";
        let file = config.public.path + config.public.output + executionName + '_UL-ax-KPI_Report.xlsx';

        await workbook.xlsx.readFile(templateFile)
            .then(async function() {
                let worksheet = workbook.getWorksheet("UL-11ax-MU-MIMO_TP"); // get particular sheet
                let row_num = 2;
                let startRow = worksheet.getRow(row_num);
                // worksheet.getRow(row_num - 1).getCell(1).value = executionName;

                console.log("data--", data);

                for (let item of data) {
                    let newRow = [];

                    /* Static column values for TP-4INTF KPI data */
                    newRow.push(item["FW/Driver ver"], item["No of clients"], item["MU Groups"], item["MU Config"], item["AP-Model"], item["Environment"], item["STA1 ANT"], item["STA2 ANT"], item["STA3 ANT"], item["STA4 ANT"], item["BW"],
                        item["MCS Rates"], item["Band"], item["MU UDP STA1->AP"] ? item["MU UDP STA1->AP"] : '', item["MU UDP STA2->AP"] ? item["MU UDP STA2->AP"] : '', item["MU UDP STA3->AP"] ? item["MU UDP STA3->AP"] : '', item["MU UDP STA4->AP"] ? item["MU UDP STA4->AP"] : '',
                        item["MU UDP"] ? item["MU UDP"] : '', item["Expected TP"], item["SU UDP STA1->AP"] ? item["SU UDP STA1->AP"] : '', item["SU UDP STA2->AP"] ? item["SU UDP STA2->AP"] : '', item["SU UDP STA3->AP"] ? item["SU UDP STA3->AP"] : '', item["SU UDP STA4->AP"] ? item["SU UDP STA4->AP"] : '', item["SU UDP"] ? item["SU UDP"] : '',
                        item["UDP MUvsSU gain"], item["MU TCP STA1->AP"] ? item["MU TCP STA1->AP"] : '', item["MU TCP STA2->AP"] ? item["MU TCP STA2->AP"] : '', item["MU TCP STA3->AP"] ? item["MU TCP STA3->AP"] : '', item["MU TCP STA4->AP"] ? item["MU TCP STA4->AP"] : '', item["MU TCP"] ? item["MU TCP"] : '', item["Expected TP"],
                        item["SU TCP STA1->AP"] ? item["SU TCP STA1->AP"] : '', item["SU TCP STA2->AP"] ? item["SU TCP STA2->AP"] : '', item["SU TCP STA3->AP"] ? item["SU TCP STA3->AP"] : '', item["SU TCP STA4->AP"] ? item["SU TCP STA4->AP"] : '', item["SU TCP"] ? item["SU TCP"] : '', item["TCP MUvsSU gain"], item["STA1"], item["STA2"], item["STA3"], item["STA4"],
                        item["Pvt build"], item["AP-SoC Rev"], item["traffic Tool"], item["Mode/BW"], item["Channel"], item["Trigger frame[Milli secs]"], item["Data bytes"],
                        item["Target RSSI set in AP"], item["Security"], item["Date tested"], item["Total Duration"], item["Comments"]);


                    startRow = worksheet.getRow(row_num);
                    for (let index = 0; index < newRow.length; index++) {
                        startRow.getCell(index + 1).value = newRow[index];
                    }
                    row_num += 1;
                }
                await workbook.xlsx.writeFile(file); // xlsx format generated from the above template
                console.log("file - ", file);
            });
        console.log("file return- ", file);
        return file;
    } catch (err) {
        logger.error("generateUL11axReport : ", err);
    }
}

/*
    Creates a new xlsx excel workbook from the existing OFDMA SCBT template for given OFDMA-DL execution.
*/
async function generateOfdmaDlReport(data, executionName) {
    try {
        const workbook = new ExcelJS.Workbook(); // creates a new workbook
        let templateFile = config.public.path + config.public.templates + "OFDMA-SCBT-DL.xlsx";
        let file = config.public.path + config.public.output + executionName + 'KPI_Report.xlsx';

        await workbook.xlsx.readFile(templateFile)
            .then(async function() {
                let worksheet = workbook.getWorksheet("OFDMA-DL"); // get particular sheet
                let row_num = 2;
                let startRow = worksheet.getRow(row_num);

                for (let item of data) {
                    let newRow = [];

                    /* Static column values for OFDMA-DL KPI data */
                    newRow.push(item["Date"], item["SOC"] ? item["SOC"] : '', item["AP Platform"] ? item["AP Platform"] : '', item["AP Build"] ? item["AP Build"] : '', item["Type"] ? item["Type"] : '', item["Mode"] ? item["Mode"] : '', item["Band"],
                        item["Channel"], item["Bandwidth"], item["Security"], item["Coding"] ? item["Coding"] : '', item["GI"], item["SS"], item["Rate"], item["WFO"] ? item["WFO"] : '', item["Aggregation"], item["DL mode"] ? item["DL mode"] : '',
                        item["wlmgr version"] ? item["wlmgr version"] : '', item["TID"] ? item["TID"] : '', item["No. of STAs"], item["Delay time (ms)"] ? item["Delay time (ms)"] : '', item["RU_mode"] ? item["RU_mode"] : '', item["STA1"], item["STA2"],
                        item["STA3"], item["STA4"], item["DL-OFDMA"], item["KPI"] ? item["KPI"] : '', item["SU"], item["Gain"], item["iperf -l"] ? item["iperf -l"] : '', item["STA antenna"], item["PowerTable"] ? item["PowerTable"] : '', item["Bfmee"] ? item["Bfmee"] : '',
                        item["Protection"] ? item["Protection"] : '', item["STA Platform"] ? item["STA Platform"] : '', item["STA S/W information"] ? item["STA S/W information"] : '', item["AP-Backend"] ? item["AP-Backend"] : '', item["STA-Backend"] ? item["STA-Backend"] : '',
                        item["Test Tool"] ? item["Test Tool"] : '', item["Environment"] ? item["Environment"] : '', item["Bug Num"] ? item["Bug Num"] : '', item["Comments"]
                    );

                    startRow = worksheet.getRow(row_num);
                    for (let index = 0; index < newRow.length; index++) {
                        startRow.getCell(index + 1).value = newRow[index];
                    }
                    row_num += 1;
                }
                await workbook.xlsx.writeFile(file); // xlsx format generated from the above template
                console.log("file - ", file);
            });
        console.log("file return- ", file);
        return file;
    } catch (err) {
        logger.error("generateOfdmaDlReport : ", err);
    }
}

/*
    Creates a new xlsx excel workbook from the existing OFDMA SCBT template for given OFDMA-UL execution.
*/
async function generateOfdmaUlReport(data, executionName) {
    try {
        const workbook = new ExcelJS.Workbook(); // creates a new workbook
        let templateFile = config.public.path + config.public.templates + "OFDMA-SCBT-UL.xlsx";
        let file = config.public.path + config.public.output + executionName + 'KPI_Report.xlsx';

        await workbook.xlsx.readFile(templateFile)
            .then(async function() {
                let worksheet = workbook.getWorksheet("OFDMA-UL"); // get particular sheet
                let row_num = 2;
                let startRow = worksheet.getRow(row_num);

                for (let item of data) {
                    let newRow = [];

                    /* Static column values for OFDMA-UL KPI data */
                    newRow.push(item["Date"], item["SOC"] ? item["SOC"] : '', item["AP Platform"] ? item["AP Platform"] : '', item["AP Build"] ? item["AP Build"] : '', item["Type"] ? item["Type"] : '', item["Mode"] ? item["Mode"] : '', item["Band"],
                        item["Channel"], item["Bandwidth"], item["Security"], item["Coding"] ? item["Coding"] : '', item["SS"], item["Rate"], item["WFO"] ? item["WFO"] : '', item["Aggregation"], item["UL mode"] ? item["UL mode"] : '',
                        item["ul_mimo_datalen"] ? item["ul_mimo_datalen"] : '', item["wlmgr version"] ? item["wlmgr version"] : '', item["No. of STAs"], item["TF_Type"] ? item["TF_Type"] : '', item["BSRP"] ? item["BSRP"] : '', item["TF time (ms)"] ? item["TF time (ms)"] : '', item["TF_Continue"] ? item["TF_Continue"] : '', item["RU Allocation"] ? item["RU Allocation"] : '', item["STA1"], item["STA2"],
                        item["STA3"], item["STA4"], item["UL-OFDMA"], item["KPI"] ? item["KPI"] : '', item["SU"], item["Gain"], item["iperf -l"] ? item["iperf -l"] : '', item["STA antenna"], item["PowerTable"] ? item["PowerTable"] : '', item["Bfmee"] ? item["Bfmee"] : '',
                        item["Protection"] ? item["Protection"] : '', item["STA Platform"] ? item["STA Platform"] : '', item["STA S/W information"] ? item["STA S/W information"] : '', item["AP-Backend"] ? item["AP-Backend"] : '', item["STA-Backend"] ? item["STA-Backend"] : '',
                        item["Test Tool"] ? item["Test Tool"] : '', item["Environment"] ? item["Environment"] : '', item["Bug Num"] ? item["Bug Num"] : '', item["Comments"]
                    );

                    startRow = worksheet.getRow(row_num);
                    for (let index = 0; index < newRow.length; index++) {
                        startRow.getCell(index + 1).value = newRow[index];
                    }
                    row_num += 1;
                }
                await workbook.xlsx.writeFile(file); // xlsx format generated from the above template
                console.log("file - ", file);
            });
        console.log("file return- ", file);
        return file;
    } catch (err) {
        logger.error("generateOfdmaUlReport : ", err);
    }
}

/*
    Creates a new xlsx excel workbook from the existing IOP Performance report format template for given IopPerf STA_TP execution.
*/
async function generateIopPerfReport(data, executionName) {
    try {
        const workbook = new ExcelJS.Workbook(); // creates a new workbook
        let templateFile = config.public.path + config.public.templates + "IOP Performance_report_format.xlsx";
        let file = config.public.path + config.public.output + executionName + 'KPI_Report.xlsx';

        await workbook.xlsx.readFile(templateFile)
            .then(async function() {
                let worksheet = workbook.getWorksheet("STA_TP"); // get particular sheet
                let row_num = 5;
                let startRow = worksheet.getRow(row_num);

                for (let item of data) {
                    let newRow = ['', '', ''];
                    worksheet.getRow(5).getCell(1).value = executionName;

                    /* Static column values for IopPerf KPI data */
                    newRow.push(item["IOP_TP TYPE"], item["DUT"], item["SoC Version"], item["SoC TYPE"], item["Release"], item["LSP Ver."], item["DUT Fw/Drv"], item["Board"], item["Interface"],
                        item["Channel | 2 GHz"], item["Channel | 5 GHz"], item["Aggregation"], item["11ax NSS"], item["11ac NSS"], item["Guard Interval"], item["WMM"], item["Power Table"],
                        item["superBA"], item["RTS Protection"] ? item["RTS Protection"] : '', item["BeamForming"] ? item["BeamForming"] : '', item["Data Rate"], item["STA Device"], item["Category"],
                        item["STA FW/Drv"], item["PHY TYPE"], item["Security"]);

                    /* Band Mapped column values for IopPerf KPI data */
                    newRow.push('', (item["5GHz"] ? item["5GHz"]["Tcp_Tx"]["value"] : ''), (item["5GHz"] ? item["5GHz"]["Tcp_Rx"]["value"] : ''), (item["5GHz"] ? item["5GHz"]["Udp_Tx"]["value"] : ''), (item["5GHz"] ? item["5GHz"]["Udp_Rx"]["value"] : ''), (item["5GHz"] ? item["5GHz"]["PHY Rate"]["value"] : ''),
                        '', (item["2GHz"] ? item["2GHz"]["Tcp_Tx"]["value"] : ''), (item["2GHz"] ? item["2GHz"]["Tcp_Rx"]["value"] : ''), (item["2GHz"] ? item["2GHz"]["Udp_Tx"]["value"] : ''), (item["2GHz"] ? item["2GHz"]["Udp_Rx"]["value"] : ''), (item["2GHz"] ? item["2GHz"]["PHY Rate"]["value"] : ''),
                        '', item["Traffic Tool"], item["No of Traffic Pair (TCP)"], item["No of Traffic Pair (UDP)"], item["Traffic Duration"], item["Test Environment"], '', item["DUT Backend"], '', item["Comments"]);

                    startRow = worksheet.getRow(row_num);
                    for (let index = 0; index < newRow.length; index++) {
                        startRow.getCell(index + 1).value = newRow[index];
                    }
                    row_num += 1;
                }
                await workbook.xlsx.writeFile(file); // xlsx format generated from the above template
                console.log("file - ", file);
            });
        console.log("file return- ", file);
        return file;
    } catch (err) {
        logger.error("generateIopPerfReport : ", err);
    }
}

/*
    Creates a new xlsx excel workbook from the existing BAT_Cable-up_report_format template for given BAT CABLE UP execution.
*/
async function generateBatCableUpReport(data, executionName) {
    try {
        const workbook = new ExcelJS.Workbook(); // creates a new workbook
        let templateFile = config.public.path + config.public.templates + "BAT_Cable-up_report_format.xlsx";
        let file = config.public.path + config.public.output + executionName + 'KPI_Report.xlsx';

        await workbook.xlsx.readFile(templateFile)
            .then(async function() {
                let worksheet = workbook.getWorksheet("STA_TP"); // get particular sheet
                let row_num = 9;
                let startRow = worksheet.getRow(row_num);

                for (let item of data) {
                    let newRow = ['', '', ''];
                    worksheet.getRow(9).getCell(1).value = executionName;

                    /* Static column values for BAT CABLE UP KPI data */
                    newRow.push(item["AP_TP TYPE"], item["DUT"], item["SoC Version"], item["SoC TYPE"], item["Release"], item["LSP Ver."], item["DUT Fw/Drv"], item["Board"], item["Interface"], item["Channel | 2 GHz"], item["Channel | 5 GHz"], item["Aggregation"], item["11ax NSS"],
                        item["11ac NSS"], item["Guard Interval"], item["LDPC"], item["STBC"], item["WMM"], item["Power Table"], item["superBA"], item["RTS Protection"], item["BeamForming"], item["EDMAC"], item["CCK Desense"], item["RX Abort"], item["Data Rate"], item["STA Device"],
                        item["Host Platform"], item["STA OS/LSP"], item["STA FW/Drv"], item["STA Beamforming Config"], item["STA 11ax NSS"], item["STA 11ac NSS"], item["STA Aggregation"], item["STA SuperBA"], item["STA Power Table"], item["STA RTS Protection"], item["RSSI"], item["Security"]);

                    /* Band Mapped column values for BAT CABLE UP KPI data */
                    newRow.push('', (item["HE-80MHz | 5GHz"] ? item["HE-80MHz | 5GHz"]["Tcp_Tx"]["value"] : ''), (item["HE-80MHz | 5GHz"] ? item["HE-80MHz | 5GHz"]["Tcp_Rx"]["value"] : ''), (item["HE-80MHz | 5GHz"] ? item["HE-80MHz | 5GHz"]["Tcp_BI"]["value"] : ''), (item["HE-80MHz | 5GHz"] ? item["HE-80MHz | 5GHz"]["Udp_Tx"]["value"] : ''), (item["HE-80MHz | 5GHz"] ? item["HE-80MHz | 5GHz"]["Udp_Rx"]["value"] : ''), (item["HE-80MHz | 5GHz"] ? item["HE-80MHz | 5GHz"]["Udp_BI"]["value"] : ''),
                        '', (item["HE-40MHz | 5GHz"] ? item["HE-40MHz | 5GHz"]["Tcp_Tx"]["value"] : ''), (item["HE-40MHz | 5GHz"] ? item["HE-40MHz | 5GHz"]["Tcp_Rx"]["value"] : ''), (item["HE-40MHz | 5GHz"] ? item["HE-40MHz | 5GHz"]["Tcp_BI"]["value"] : ''), (item["HE-40MHz | 5GHz"] ? item["HE-40MHz | 5GHz"]["Udp_Tx"]["value"] : ''), (item["HE-40MHz | 5GHz"] ? item["HE-40MHz | 5GHz"]["Udp_Rx"]["value"] : ''), (item["HE-40MHz | 5GHz"] ? item["HE-40MHz | 5GHz"]["Udp_BI"]["value"] : ''),
                        '', (item["HE-20MHz | 5GHz"] ? item["HE-20MHz | 5GHz"]["Tcp_Tx"]["value"] : ''), (item["HE-20MHz | 5GHz"] ? item["HE-20MHz | 5GHz"]["Tcp_Rx"]["value"] : ''), (item["HE-20MHz | 5GHz"] ? item["HE-20MHz | 5GHz"]["Tcp_BI"]["value"] : ''), (item["HE-20MHz | 5GHz"] ? item["HE-20MHz | 5GHz"]["Udp_Tx"]["value"] : ''), (item["HE-20MHz | 5GHz"] ? item["HE-20MHz | 5GHz"]["Udp_Rx"]["value"] : ''), (item["HE-20MHz | 5GHz"] ? item["HE-20MHz | 5GHz"]["Udp_BI"]["value"] : ''),
                        '', (item["HE-40MHz | 2GHz"] ? item["HE-40MHz | 2GHz"]["Tcp_Tx"]["value"] : ''), (item["HE-40MHz | 2GHz"] ? item["HE-40MHz | 2GHz"]["Tcp_Rx"]["value"] : ''), (item["HE-40MHz | 2GHz"] ? item["HE-40MHz | 2GHz"]["Tcp_BI"]["value"] : ''), (item["HE-40MHz | 2GHz"] ? item["HE-40MHz | 2GHz"]["Udp_Tx"]["value"] : ''), (item["HE-40MHz | 2GHz"] ? item["HE-40MHz | 2GHz"]["Udp_Rx"]["value"] : ''), (item["HE-40MHz | 2GHz"] ? item["HE-40MHz | 2GHz"]["Udp_BI"]["value"] : ''),
                        '', (item["HE-20MHz | 2GHz"] ? item["HE-20MHz | 2GHz"]["Tcp_Tx"]["value"] : ''), (item["HE-20MHz | 2GHz"] ? item["HE-20MHz | 2GHz"]["Tcp_Rx"]["value"] : ''), (item["HE-20MHz | 2GHz"] ? item["HE-20MHz | 2GHz"]["Tcp_BI"]["value"] : ''), (item["HE-20MHz | 2GHz"] ? item["HE-20MHz | 2GHz"]["Udp_Tx"]["value"] : ''), (item["HE-20MHz | 2GHz"] ? item["HE-20MHz | 2GHz"]["Udp_Rx"]["value"] : ''), (item["HE-20MHz | 2GHz"] ? item["HE-20MHz | 2GHz"]["Udp_BI"]["value"] : ''),
                        '', (item["VHT-80MHz | 5GHz"] ? item["VHT-80MHz | 5GHz"]["Tcp_Tx"]["value"] : ''), (item["VHT-80MHz | 5GHz"] ? item["VHT-80MHz | 5GHz"]["Tcp_Rx"]["value"] : ''), (item["VHT-80MHz | 5GHz"] ? item["VHT-80MHz | 5GHz"]["Tcp_BI"]["value"] : ''), (item["VHT-80MHz | 5GHz"] ? item["VHT-80MHz | 5GHz"]["Udp_Tx"]["value"] : ''), (item["VHT-80MHz | 5GHz"] ? item["VHT-80MHz | 5GHz"]["Udp_Rx"]["value"] : ''), (item["VHT-80MHz | 5GHz"] ? item["VHT-80MHz | 5GHz"]["Udp_BI"]["value"] : ''),
                        '', (item["VHT-40MHz | 5GHz"] ? item["VHT-40MHz | 5GHz"]["Tcp_Tx"]["value"] : ''), (item["VHT-40MHz | 5GHz"] ? item["VHT-40MHz | 5GHz"]["Tcp_Rx"]["value"] : ''), (item["VHT-40MHz | 5GHz"] ? item["VHT-40MHz | 5GHz"]["Tcp_BI"]["value"] : ''), (item["VHT-40MHz | 5GHz"] ? item["VHT-40MHz | 5GHz"]["Udp_Tx"]["value"] : ''), (item["VHT-40MHz | 5GHz"] ? item["VHT-40MHz | 5GHz"]["Udp_Rx"]["value"] : ''), (item["VHT-40MHz | 5GHz"] ? item["VHT-40MHz | 5GHz"]["Udp_BI"]["value"] : ''),
                        '', (item["VHT-20MHz | 5GHz"] ? item["VHT-20MHz | 5GHz"]["Tcp_Tx"]["value"] : ''), (item["VHT-20MHz | 5GHz"] ? item["VHT-20MHz | 5GHz"]["Tcp_Rx"]["value"] : ''), (item["VHT-20MHz | 5GHz"] ? item["VHT-20MHz | 5GHz"]["Tcp_BI"]["value"] : ''), (item["VHT-20MHz | 5GHz"] ? item["VHT-20MHz | 5GHz"]["Udp_Tx"]["value"] : ''), (item["VHT-20MHz | 5GHz"] ? item["VHT-20MHz | 5GHz"]["Udp_Rx"]["value"] : ''), (item["VHT-20MHz | 5GHz"] ? item["VHT-20MHz | 5GHz"]["Udp_BI"]["value"] : ''),
                        '', (item["VHT-40MHz | 2GHz"] ? item["VHT-40MHz | 2GHz"]["Tcp_Tx"]["value"] : ''), (item["VHT-40MHz | 2GHz"] ? item["VHT-40MHz | 2GHz"]["Tcp_Rx"]["value"] : ''), (item["VHT-40MHz | 2GHz"] ? item["VHT-40MHz | 2GHz"]["Tcp_BI"]["value"] : ''), (item["VHT-40MHz | 2GHz"] ? item["VHT-40MHz | 2GHz"]["Udp_Tx"]["value"] : ''), (item["VHT-40MHz | 2GHz"] ? item["VHT-40MHz | 2GHz"]["Udp_Rx"]["value"] : ''), (item["VHT-40MHz | 2GHz"] ? item["VHT-40MHz | 2GHz"]["Udp_BI"]["value"] : ''),
                        '', (item["VHT-20MHz | 2GHz"] ? item["VHT-20MHz | 2GHz"]["Tcp_Tx"]["value"] : ''), (item["VHT-20MHz | 2GHz"] ? item["VHT-20MHz | 2GHz"]["Tcp_Rx"]["value"] : ''), (item["VHT-20MHz | 2GHz"] ? item["VHT-20MHz | 2GHz"]["Tcp_BI"]["value"] : ''), (item["VHT-20MHz | 2GHz"] ? item["VHT-20MHz | 2GHz"]["Udp_Tx"]["value"] : ''), (item["VHT-20MHz | 2GHz"] ? item["VHT-20MHz | 2GHz"]["Udp_Rx"]["value"] : ''), (item["VHT-20MHz | 2GHz"] ? item["VHT-20MHz | 2GHz"]["Udp_BI"]["value"] : ''),
                        '', item["Comments"], '', item["Traffic Tool"], item["No of Traffic Pair (TCP)"], item["TCP Window Size"], item["UDP Bandwidth"], item["No of Traffic Pair (UDP)"], item["Traffic Duration"], item["Offered Load"], item["Test Environment"], '', item["DUT MAC"], item["DUT Backend"], item["Companion Device MAC"], item["Companion Device Backend"], '');

                    startRow = worksheet.getRow(row_num);
                    for (let index = 0; index < newRow.length; index++) {
                        startRow.getCell(index + 1).value = newRow[index];
                    }
                    row_num += 1;
                }
                await workbook.xlsx.writeFile(file); // xlsx format generated from the above template
                console.log("file - ", file);
            });
        console.log("file return- ", file);
        return file;
    } catch (err) {
        logger.error("generateBatCableUpReport : ", err);
    }
}

/*
    Creates a new xlsx excel workbook from the existing MBSS-SCBT_report_format template for given 8_MBSS execution.
*/
async function generateMbssScbtReport(data, executionName) {
    try {
        const workbook = new ExcelJS.Workbook(); // creates a new workbook
        let templateFile = config.public.path + config.public.templates + "MBSS-SCBT_report_format.xlsx";
        let file = config.public.path + config.public.output + executionName + 'KPI_Report.xlsx';

        await workbook.xlsx.readFile(templateFile)
            .then(async function() {
                let worksheet = workbook.getWorksheet("8_MBSS"); // get particular sheet
                let row_num = 9;
                let startRow = worksheet.getRow(row_num);

                for (let item of data) {
                    let newRow = ['', '', ''];
                    worksheet.getRow(9).getCell(1).value = executionName;

                    /* Static column values for 8_MBSS KPI data */
                    newRow.push(item["AP_TP TYPE"], item["DUT"], item["SoC Version"], item["SoC TYPE"], item["Release"], item["LSP Ver."], item["DUT Fw/Drv"], item["Board"], item["Interface"], item["Channel | 2 GHz"], item["Channel | 5 GHz"], item["Aggregation"], item["11ax NSS"],
                        item["11ac NSS"], item["Guard Interval"], item["LDPC"], item["STBC"], item["WMM"], item["Power Table"], item["superBA"], item["RTS Protection"], item["BeamForming"], item["EDMAC"], item["CCK Desense"], item["RX Abort"], item["Data Rate"], item["STA Device"],
                        item["Host Platform"], item["STA OS/LSP"], item["STA FW/Drv"], item["STA Beamforming Config"], item["STA 11ax NSS"], item["STA 11ac NSS"], item["STA Aggregation"], item["STA SuperBA"], item["STA Power Table"], item["STA RTS Protection"], item["RSSI"],
                        item["Security"], item["BSS"]);

                    /* Band Mapped column values for 8_MBSS KPI data */
                    newRow.push('', (item["HE-80MHz | 5GHz"] ? item["HE-80MHz | 5GHz"]["Tcp_Tx"]["value"] : ''), (item["HE-80MHz | 5GHz"] ? item["HE-80MHz | 5GHz"]["Tcp_Rx"]["value"] : ''), (item["HE-80MHz | 5GHz"] ? item["HE-80MHz | 5GHz"]["Udp_Tx"]["value"] : ''), (item["HE-80MHz | 5GHz"] ? item["HE-80MHz | 5GHz"]["Udp_Rx"]["value"] : ''),
                        '', (item["HE-20MHz | 2GHz"] ? item["HE-20MHz | 2GHz"]["Tcp_Tx"]["value"] : ''), (item["HE-20MHz | 2GHz"] ? item["HE-20MHz | 2GHz"]["Tcp_Rx"]["value"] : ''), (item["HE-20MHz | 2GHz"] ? item["HE-20MHz | 2GHz"]["Udp_Tx"]["value"] : ''), (item["HE-20MHz | 2GHz"] ? item["HE-20MHz | 2GHz"]["Udp_Rx"]["value"] : ''),
                        '', (item["VHT-80MHz | 5GHz"] ? item["VHT-80MHz | 5GHz"]["Tcp_Tx"]["value"] : ''), (item["VHT-80MHz | 5GHz"] ? item["VHT-80MHz | 5GHz"]["Tcp_Rx"]["value"] : ''), (item["VHT-80MHz | 5GHz"] ? item["VHT-80MHz | 5GHz"]["Udp_Tx"]["value"] : ''), (item["VHT-80MHz | 5GHz"] ? item["VHT-80MHz | 5GHz"]["Udp_Rx"]["value"] : ''),
                        '', (item["VHT-20MHz | 2GHz"] ? item["VHT-20MHz | 2GHz"]["Tcp_Tx"]["value"] : ''), (item["VHT-20MHz | 2GHz"] ? item["VHT-20MHz | 2GHz"]["Tcp_Rx"]["value"] : ''), (item["VHT-20MHz | 2GHz"] ? item["VHT-20MHz | 2GHz"]["Udp_Tx"]["value"] : ''), (item["VHT-20MHz | 2GHz"] ? item["VHT-20MHz | 2GHz"]["Udp_Rx"]["value"] : ''),
                        '', item["Comments"], '', item["Traffic Tool"], item["No of Traffic Pair (TCP)"], item["TCP Window Size"], item["UDP Bandwidth"], item["No of Traffic Pair (UDP)"], item["Traffic Duration"], item["Offered Load"], item["Test Environment"], '', item["DUT MAC"], item["DUT Backend"], item["Companion Device MAC"], item["Companion Device Backend"], '');

                    startRow = worksheet.getRow(row_num);
                    for (let index = 0; index < newRow.length; index++) {
                        startRow.getCell(index + 1).value = newRow[index];
                    }
                    row_num += 1;
                }
                await workbook.xlsx.writeFile(file); // xlsx format generated from the above template
                console.log("file - ", file);
            });
        console.log("file return- ", file);
        return file;
    } catch (err) {
        logger.error("generateMbssScbtReport : ", err);
    }
}

/*
    Creates a new xlsx excel workbook from the existing Unified All KPI template for given Standalone_CPu-Util execution.
*/
async function generateStaCPuUtilReport(data, executionName) {
    try {
        const workbook = new ExcelJS.Workbook(); // creates a new workbook
        let templateFile = config.public.path + config.public.templates + "STA_Cpu_Util.xlsx";
        let file = config.public.path + config.public.output + executionName + 'KPI_Report.xlsx';

        await workbook.xlsx.readFile(templateFile)
            .then(async function() {
                let worksheet = workbook.getWorksheet("STA_Cpu_Util"); // get particular sheet
                let row_num = 8;
                let startRow = worksheet.getRow(row_num);
                let slVal = 1;
                for (let item of data) {
                    let newRow = ['', '', slVal];
                    worksheet.getRow(8).getCell(1).value = executionName;

                    /* Static column values for Standalone_CPu-Util KPI data */
                    newRow.push(item["TP TYPE"], item["DUT"], item["SoC Version"], item["SoC TYPE"], item["DUT Fw/Drv"], item["Interface"], item["Aggregation"], item["Spatial Streams"], item["Guard Interval"], item["Data Rate"],
                        item["Channel | 2 GHz"], item["Channel | 5 GHz"], item["SDIO Clock"], item["Companion Device/Ex-AP/Ex-STA/Ex-P2P-GO/Ex-P2P-GC"] ? item["Companion Device/Ex-AP/Ex-STA/Ex-P2P-GO/Ex-P2P-GC"] : '',
                        item["Companion Device FW/Drv"] ? item["Companion Device FW/Drv"] : '', item["Host Platform"], item["OS"] ? item["OS"] : '', item["DUT Beamforming Config"] ? item["DUT Beamforming Config"] : '',
                        item["Companion Device Beamforming Config"] ? item["Companion Device Beamforming Config"] : '', item["LDPC"] ? item["LDPC"] : '', item["STBC"] ? item["STBC"] : '', item["DUT EdMac"] ? item["DUT EdMac"] : '',
                        item["Misc"] ? item["Misc"] : '', item["Security"], item["Test Repetition"], item["DUT Mode"] ? item["DUT Mode"] : '', item["DUT Protocol"], item["NAPI"] ? item["NAPI"] : '', item["CPU Clock Speed"] ? item["CPU Clock Speed"] : '',
                        item["BOGO MIPS of Host Platform"], item["D-MIPS of Host Platform"] ? item["D-MIPS of Host Platform"] : '', item["No Of CPU Cores"], item["CPU Time out of %"] ? item["CPU Time out of %"] : '', item["Multi-Core Support"] ? item["Multi-Core Support"] : '',
                        item["Throughput Limit"] ? item["Throughput Limit"] : '', item["UDP Bandwidth / TCP Window Size"] ? item["UDP Bandwidth / TCP Window Size"] : '', item["Throughput (Mbps)"] ? item["Throughput (Mbps)"] : '', item["MIPS / Mbps"] ? item["MIPS / Mbps"] : '',
                        item["CPU Usage in D-MIPS"] ? item["CPU Usage in D-MIPS"] : '', item["CPU Usage in MIPS"] ? item["CPU Usage in MIPS"] : '', item["CPU UTILIZATION % - Iperf per core"] ? item["CPU UTILIZATION % - Iperf per core"] : '',
                        item["CPU UTILIZATION % - Iperf"] ? item["CPU UTILIZATION % - Iperf"] : '', item["CPU Utilization %"] ? item["CPU Utilization %"] : '', item["Process Threads"], item["Iperf"], item["Process1"], item["Process2"], item["Process3"], item["Process4"], item["Process5"],
                        item["Process6"], item["Process7"] ? item["Process7"] : '', item["Process8"] ? item["Process8"] : '', item["Process9"] ? item["Process9"] : '', item["Process10"] ? item["Process10"] : '', item["Process11"] ? item["Process11"] : '', item["Comments"]);

                    startRow = worksheet.getRow(row_num);
                    for (let index = 0; index < newRow.length; index++) {
                        startRow.getCell(index + 1).value = newRow[index];
                    }
                    row_num += 1;
                    slVal += 1;
                }
                await workbook.xlsx.writeFile(file); // xlsx format generated from the above template
                console.log("file - ", file);
            });
        console.log("file return- ", file);
        return file;
    } catch (err) {
        logger.error("generateStaCPuUtilReport : ", err);
    }
}

/*
    Creates a new xlsx excel workbook from the existing Unified All KPI template for given DBC_CPu-Util execution.
*/
async function generateDbcCPuUtilReport(data, executionName) {
    try {
        const workbook = new ExcelJS.Workbook(); // creates a new workbook
        let templateFile = config.public.path + config.public.templates + "DBC_Cpu_Util.xlsx";
        let file = config.public.path + config.public.output + executionName + 'KPI_Report.xlsx';

        await workbook.xlsx.readFile(templateFile)
            .then(async function() {
                let worksheet = workbook.getWorksheet("DBC_Cpu-Util"); // get particular sheet
                let row_num = 5;
                let startRow = worksheet.getRow(row_num);

                for (let item of data) {
                    let newRow = ['', '', ''];
                    worksheet.getRow(5).getCell(1).value = executionName;

                    /* Static column values for DBC_CPu-Util KPI data */
                    newRow.push(item["TP TYPE"], item["DUT"], item["SoC Version"], item["SoC TYPE"], item["DUT Fw/Drv"], item["Interface"], item["SDIO Clock [MHz]"], item["Aggregation"], item["Spatial Streams"], item["Guard Interval"], item["Data Rate"], item["Connectivity Modes"], item["Companion Device 1/Ex-AP/Ex-STA/Ex-P2P-GO/Ex-P2P-GC"],
                        item["Companion Device 1 FW/Drv"], item["Companion Device 2 /Ex-AP/Ex-STA/Ex-P2P-GO/Ex-P2P-GC"], item["Companion Device 2 FW/Drv"], item["DUT Host Platform"], item["DUT OS"] ? item["DUT OS"] : '', item["INTF 1 Configuration"] ? item["INTF 1 Configuration"] : '', item["Channel | INTF 1"],
                        item["INTF 2 Configuration"] ? item["INTF 2 Configuration"] : '', item["Channel | INTF 2"], item["DRCS Timing Configuration Duty Cycle | INTF1 | INTF2"], item["Misc"], item["Security"], item["DUT Protocol (Radio-0)"], item["DUT Protocol (Radio-1)"], item["NAPI"], item["CPU Clock Speed (MHz)"], item["BOGO MIPS of Host Platform"], item["D-MIPS of Host Platform"],
                        item["No of CPU Cores"], item["CPU Time out of %"], item["Multi Core Support"], item["Throughput Limit"], item["UDP Bandwidth / TCP Window Size (Radio-0)"], item["UDP Bandwidth / TCP Window Size (Radio-1)"], item["Throughput (Radio-0)"], item["Throughput (Radio-1)"], item["Aggregated TP"], item["MIPS / Mbps"], item["CPU Usage in D-MIPS"], item["CPU Usage in MIPS"], item["(CPU UTILIZATION % - Iperf) Per Core"],
                        item["CPU UTILIZATION % - Iperf"], item["CPU Utilization %"], item["CPU Utilization/CPU %"], '', item["Iperf"], item["Process1"], item["Process2"], item["Process3"], item["Process4"], item["Process5"], item["Process6"], item["Process7"] ? item["Process7"] : '', item["Process8"] ? item["Process8"] : '', item["Process9"] ? item["Process9"] : '', item["Process10"] ? item["Process10"] : '', item["Comments"]);

                    startRow = worksheet.getRow(row_num);
                    for (let index = 0; index < newRow.length; index++) {
                        startRow.getCell(index + 1).value = newRow[index];
                    }
                    row_num += 1;
                }
                await workbook.xlsx.writeFile(file); // xlsx format generated from the above template
                console.log("file - ", file);
            });
        console.log("file return- ", file);
        return file;
    } catch (err) {
        logger.error("generateDbcCPuUtilReport : ", err);
    }
}

/*
    Creates a new xlsx excel workbook from the existing Unified All KPI template for given IOP-TP execution.
*/
async function generateIopTpReport(data, executionName) {
    try {
        const workbook = new ExcelJS.Workbook(); // creates a new workbook
        let templateFile = config.public.path + config.public.templates + "IOP-TP.xlsx";
        let file = config.public.path + config.public.output + executionName + 'KPI_Report.xlsx';

        await workbook.xlsx.readFile(templateFile)
            .then(async function() {
                let worksheet = workbook.getWorksheet("IOP_TP"); // get particular sheet
                let row_num = 7;
                let startRow = worksheet.getRow(row_num);
                let slVal = 1;

                for (let item of data) {
                    let newRow = ['', '', slVal];
                    worksheet.getRow(7).getCell(1).value = executionName;

                    /* Static column values for IOP_TP KPI data */
                    newRow.push(item["TP TYPE"], item["DUT"], item["SoC Version"], item["SoC TYPE"], item["DUT Fw/Drv"], item["Interface"], item["Aggregation"], item["Spatial Streams"], item["Guard Interval"], item["Data Rate"], item["Channel | 2 GHz"], item["Channel | 5 GHz"],
                        item["SDIO Clock"], item["Companion Device/Ex-AP/Ex-STA/Ex-P2P-GO/Ex-P2P-GC"], item["Companion Device FW/Drv"], item["Host Platform"], item["OS"], item["DUT Beamforming Config"], item["Companion Device Beamforming Config"], item["DUT LDPC"], item["DUT STBC"], item["EdMac"], item["More Config info"], item["Security"], item["Test Repetition"]);

                    /* Band Mapped column values for IOP-TP KPI data */
                    newRow.push('',
                        (item["HE-160MHz | 5GHz"] ? item["HE-160MHz | 5GHz"]["Tcp_Tx"]["value"] : ''),
                        (item["HE-160MHz | 5GHz"] ? item["HE-160MHz | 5GHz"]["Tcp_Rx"]["value"] : ''),
                        (item["HE-160MHz | 5GHz"] ? item["HE-160MHz | 5GHz"]["Udp_Tx"]["value"] : ''),
                        (item["HE-160MHz | 5GHz"] ? item["HE-160MHz | 5GHz"]["Udp_Rx"]["value"] : ''),
                        '',
                        (item["HE-80MHz | 5GHz"] ? item["HE-80MHz | 5GHz"]["Tcp_Tx"]["value"] : ''),
                        (item["HE-80MHz | 5GHz"] ? item["HE-80MHz | 5GHz"]["Tcp_Rx"]["value"] : ''),
                        (item["HE-80MHz | 5GHz"] ? item["HE-80MHz | 5GHz"]["Udp_Tx"]["value"] : ''),
                        (item["HE-80MHz | 5GHz"] ? item["HE-80MHz | 5GHz"]["Udp_Rx"]["value"] : ''),
                        '',
                        (item["HE-40MHz | 5GHz"] ? item["HE-40MHz | 5GHz"]["Tcp_Tx"]["value"] : ''),
                        (item["HE-40MHz | 5GHz"] ? item["HE-40MHz | 5GHz"]["Tcp_Rx"]["value"] : ''),
                        (item["HE-40MHz | 5GHz"] ? item["HE-40MHz | 5GHz"]["Udp_Tx"]["value"] : ''),
                        (item["HE-40MHz | 5GHz"] ? item["HE-40MHz | 5GHz"]["Udp_Rx"]["value"] : ''),
                        '',
                        (item["HE-20MHz | 5GHz"] ? item["HE-20MHz | 5GHz"]["Tcp_Tx"]["value"] : ''),
                        (item["HE-20MHz | 5GHz"] ? item["HE-20MHz | 5GHz"]["Tcp_Rx"]["value"] : ''),
                        (item["HE-20MHz | 5GHz"] ? item["HE-20MHz | 5GHz"]["Udp_Tx"]["value"] : ''),
                        (item["HE-20MHz | 5GHz"] ? item["HE-20MHz | 5GHz"]["Udp_Rx"]["value"] : ''),
                        '',
                        (item["HE-40MHz | 2GHz"] ? item["HE-40MHz | 2GHz"]["Tcp_Tx"]["value"] : ''),
                        (item["HE-40MHz | 2GHz"] ? item["HE-40MHz | 2GHz"]["Tcp_Rx"]["value"] : ''),
                        (item["HE-40MHz | 2GHz"] ? item["HE-40MHz | 2GHz"]["Udp_Tx"]["value"] : ''),
                        (item["HE-40MHz | 2GHz"] ? item["HE-40MHz | 2GHz"]["Udp_Rx"]["value"] : ''),
                        '',
                        (item["HE-20MHz | 2GHz"] ? item["HE-20MHz | 2GHz"]["Tcp_Tx"]["value"] : ''),
                        (item["HE-20MHz | 2GHz"] ? item["HE-20MHz | 2GHz"]["Tcp_Rx"]["value"] : ''),
                        (item["HE-20MHz | 2GHz"] ? item["HE-20MHz | 2GHz"]["Udp_Tx"]["value"] : ''),
                        (item["HE-20MHz | 2GHz"] ? item["HE-20MHz | 2GHz"]["Udp_Rx"]["value"] : ''),
                        '',
                        (item["VHT-160MHz | 5GHz"] ? item["VHT-160MHz | 5GHz"]["Tcp_Tx"]["value"] : ''),
                        (item["VHT-160MHz | 5GHz"] ? item["VHT-160MHz | 5GHz"]["Tcp_Rx"]["value"] : ''),
                        (item["VHT-160MHz | 5GHz"] ? item["VHT-160MHz | 5GHz"]["Udp_Tx"]["value"] : ''),
                        (item["VHT-160MHz | 5GHz"] ? item["VHT-160MHz | 5GHz"]["Udp_Rx"]["value"] : ''),
                        '',
                        (item["VHT-80MHz | 5GHz"] ? item["VHT-80MHz | 5GHz"]["Tcp_Tx"]["value"] : ''),
                        (item["VHT-80MHz | 5GHz"] ? item["VHT-80MHz | 5GHz"]["Tcp_Rx"]["value"] : ''),
                        (item["VHT-80MHz | 5GHz"] ? item["VHT-80MHz | 5GHz"]["Udp_Tx"]["value"] : ''),
                        (item["VHT-80MHz | 5GHz"] ? item["VHT-80MHz | 5GHz"]["Udp_Rx"]["value"] : ''),
                        '',
                        (item["VHT-40MHz | 5GHz"] ? item["VHT-40MHz | 5GHz"]["Tcp_Tx"]["value"] : ''),
                        (item["VHT-40MHz | 5GHz"] ? item["VHT-40MHz | 5GHz"]["Tcp_Rx"]["value"] : ''),
                        (item["VHT-40MHz | 5GHz"] ? item["VHT-40MHz | 5GHz"]["Udp_Tx"]["value"] : ''),
                        (item["VHT-40MHz | 5GHz"] ? item["VHT-40MHz | 5GHz"]["Udp_Rx"]["value"] : ''),
                        '',
                        (item["VHT-20MHz | 5GHz"] ? item["VHT-20MHz | 5GHz"]["Tcp_Tx"]["value"] : ''),
                        (item["VHT-20MHz | 5GHz"] ? item["VHT-20MHz | 5GHz"]["Tcp_Rx"]["value"] : ''),
                        (item["VHT-20MHz | 5GHz"] ? item["VHT-20MHz | 5GHz"]["Udp_Tx"]["value"] : ''),
                        (item["VHT-20MHz | 5GHz"] ? item["VHT-20MHz | 5GHz"]["Udp_Rx"]["value"] : ''),
                        '',
                        (item["VHT-40MHz | 2GHz"] ? item["VHT-40MHz | 2GHz"]["Tcp_Tx"]["value"] : ''),
                        (item["VHT-40MHz | 2GHz"] ? item["VHT-40MHz | 2GHz"]["Tcp_Rx"]["value"] : ''),
                        (item["VHT-40MHz | 2GHz"] ? item["VHT-40MHz | 2GHz"]["Udp_Tx"]["value"] : ''),
                        (item["VHT-40MHz | 2GHz"] ? item["VHT-40MHz | 2GHz"]["Udp_Rx"]["value"] : ''),
                        '',
                        (item["VHT-20MHz | 2GHz"] ? item["VHT-20MHz | 2GHz"]["Tcp_Tx"]["value"] : ''),
                        (item["VHT-20MHz | 2GHz"] ? item["VHT-20MHz | 2GHz"]["Tcp_Rx"]["value"] : ''),
                        (item["VHT-20MHz | 2GHz"] ? item["VHT-20MHz | 2GHz"]["Udp_Tx"]["value"] : ''),
                        (item["VHT-20MHz | 2GHz"] ? item["VHT-20MHz | 2GHz"]["Udp_Rx"]["value"] : ''),
                        '',
                        (item["HT-40MHz | 5GHz"] ? item["HT-40MHz | 5GHz"]["Tcp_Tx"]["value"] : ''),
                        (item["HT-40MHz | 5GHz"] ? item["HT-40MHz | 5GHz"]["Tcp_Rx"]["value"] : ''),
                        (item["HT-40MHz | 5GHz"] ? item["HT-40MHz | 5GHz"]["Udp_Tx"]["value"] : ''),
                        (item["HT-40MHz | 5GHz"] ? item["HT-40MHz | 5GHz"]["Udp_Rx"]["value"] : ''),
                        '',
                        (item["HT-20MHz | 5GHz"] ? item["HT-20MHz | 5GHz"]["Tcp_Tx"]["value"] : ''),
                        (item["HT-20MHz | 5GHz"] ? item["HT-20MHz | 5GHz"]["Tcp_Rx"]["value"] : ''),
                        (item["HT-20MHz | 5GHz"] ? item["HT-20MHz | 5GHz"]["Udp_Tx"]["value"] : ''),
                        (item["HT-20MHz | 5GHz"] ? item["HT-20MHz | 5GHz"]["Udp_Rx"]["value"] : ''),
                        '',
                        (item["HT-40MHz | 2GHz"] ? item["HT-40MHz | 2GHz"]["Tcp_Tx"]["value"] : ''),
                        (item["HT-40MHz | 2GHz"] ? item["HT-40MHz | 2GHz"]["Tcp_Rx"]["value"] : ''),
                        (item["HT-40MHz | 2GHz"] ? item["HT-40MHz | 2GHz"]["Udp_Tx"]["value"] : ''),
                        (item["HT-40MHz | 2GHz"] ? item["HT-40MHz | 2GHz"]["Udp_Rx"]["value"] : ''),
                        '',
                        (item["HT-20MHz | 2GHz"] ? item["HT-20MHz | 2GHz"]["Tcp_Tx"]["value"] : ''),
                        (item["HT-20MHz | 2GHz"] ? item["HT-20MHz | 2GHz"]["Tcp_Rx"]["value"] : ''),
                        (item["HT-20MHz | 2GHz"] ? item["HT-20MHz | 2GHz"]["Udp_Tx"]["value"] : ''),
                        (item["HT-20MHz | 2GHz"] ? item["HT-20MHz | 2GHz"]["Udp_Rx"]["value"] : ''),
                        '',
                        (item["Non-HT BG | 2GHz"] ? item["Non-HT BG | 2GHz"]["Tcp_Tx"]["value"] : ''),
                        (item["Non-HT BG | 2GHz"] ? item["Non-HT BG | 2GHz"]["Tcp_Rx"]["value"] : ''),
                        (item["Non-HT BG | 2GHz"] ? item["Non-HT BG | 2GHz"]["Udp_Tx"]["value"] : ''),
                        (item["Non-HT BG | 2GHz"] ? item["Non-HT BG | 2GHz"]["Udp_Rx"]["value"] : ''),
                        '',
                        (item["Non-HT A | 5GHz"] ? item["Non-HT A | 5GHz"]["Tcp_Tx"]["value"] : ''),
                        (item["Non-HT A | 5GHz"] ? item["Non-HT A | 5GHz"]["Tcp_Rx"]["value"] : ''),
                        (item["Non-HT A | 5GHz"] ? item["Non-HT A | 5GHz"]["Udp_Tx"]["value"] : ''),
                        (item["Non-HT A | 5GHz"] ? item["Non-HT A | 5GHz"]["Udp_Rx"]["value"] : ''),
                        '',
                        (item["Non-HT B-Only | 2GHz"] ? item["Non-HT B-Only | 2GHz"]["Tcp_Tx"]["value"] : ''),
                        (item["Non-HT B-Only | 2GHz"] ? item["Non-HT B-Only | 2GHz"]["Tcp_Rx"]["value"] : ''),
                        (item["Non-HT B-Only | 2GHz"] ? item["Non-HT B-Only | 2GHz"]["Udp_Tx"]["value"] : ''),
                        (item["Non-HT B-Only | 2GHz"] ? item["Non-HT B-Only | 2GHz"]["Udp_Rx"]["value"] : ''),
                        '', item["Comments"], '');

                    newRow.push('',
                        (item["HE 80 | 5GHz"] ? item["HE 80 | 5GHz"]["Association"] : ''),
                        (item["HE 80 | 5GHz"] ? item["HE 80 | 5GHz"]["Unicast ping"] : ''),
                        (item["HE 80 | 5GHz"] ? item["HE 80 | 5GHz"]["Ping (Bi-Directional)"] : ''),
                        (item["HE 80 | 5GHz"] ? item["HE 80 | 5GHz"]["Re-association"] : ''),
                        (item["HE 80 | 5GHz"] ? item["HE 80 | 5GHz"]["TCP Data (Bi-Directional)"] : ''),
                        (item["HE 80 | 5GHz"] ? item["HE 80 | 5GHz"]["UDP Data (Bi-Directional)"] : ''),
                        (item["HE 80 | 5GHz"] ? item["HE 80 | 5GHz"]["Broadcast Data"] : ''),
                        (item["HE 80 | 5GHz"] ? item["HE 80 | 5GHz"]["Multicast Data"] : ''),
                        '',
                        (item["HE 20 | 2GHz"] ? item["HE 20 | 2GHz"]["Association"] : ''),
                        (item["HE 20 | 2GHz"] ? item["HE 20 | 2GHz"]["Unicast ping"] : ''),
                        (item["HE 20 | 2GHz"] ? item["HE 20 | 2GHz"]["Ping (Bi-Directional)"] : ''),
                        (item["HE 20 | 2GHz"] ? item["HE 20 | 2GHz"]["Re-association"] : ''),
                        (item["HE 20 | 2GHz"] ? item["HE 20 | 2GHz"]["TCP Data (Bi-Directional)"] : ''),
                        (item["HE 20 | 2GHz"] ? item["HE 20 | 2GHz"]["UDP Data (Bi-Directional)"] : ''),
                        (item["HE 20 | 2GHz"] ? item["HE 20 | 2GHz"]["Broadcast Data"] : ''),
                        (item["HE 20 | 2GHz"] ? item["HE 20 | 2GHz"]["Multicast Data"] : ''),
                        '',
                        (item["VHT 80MHz | 5GHz"] ? item["VHT 80MHz | 5GHz"]["Association"] : ''),
                        (item["VHT 80MHz | 5GHz"] ? item["VHT 80MHz | 5GHz"]["Unicast ping"] : ''),
                        (item["VHT 80MHz | 5GHz"] ? item["VHT 80MHz | 5GHz"]["Ping (Bi-Directional)"] : ''),
                        (item["VHT 80MHz | 5GHz"] ? item["VHT 80MHz | 5GHz"]["Re-association"] : ''),
                        (item["VHT 80MHz | 5GHz"] ? item["VHT 80MHz | 5GHz"]["TCP Data (Bi-Directional)"] : ''),
                        (item["VHT 80MHz | 5GHz"] ? item["VHT 80MHz | 5GHz"]["UDP Data (Bi-Directional)"] : ''),
                        (item["VHT 80MHz | 5GHz"] ? item["VHT 80MHz | 5GHz"]["Broadcast Data"] : ''),
                        (item["VHT 80MHz | 5GHz"] ? item["VHT 80MHz | 5GHz"]["Multicast Data"] : ''),
                        '',
                        (item["HT 40MHz | 5GHz"] ? item["HT 40MHz | 5GHz"]["Association"] : ''),
                        (item["HT 40MHz | 5GHz"] ? item["HT 40MHz | 5GHz"]["Unicast ping"] : ''),
                        (item["HT 40MHz | 5GHz"] ? item["HT 40MHz | 5GHz"]["Ping (Bi-Directional)"] : ''),
                        (item["HT 40MHz | 5GHz"] ? item["HT 40MHz | 5GHz"]["Re-association"] : ''),
                        (item["HT 40MHz | 5GHz"] ? item["HT 40MHz | 5GHz"]["TCP Data (Bi-Directional)"] : ''),
                        (item["HT 40MHz | 5GHz"] ? item["HT 40MHz | 5GHz"]["UDP Data (Bi-Directional)"] : ''),
                        (item["HT 40MHz | 5GHz"] ? item["HT 40MHz | 5GHz"]["Broadcast Data"] : ''),
                        (item["HT 40MHz | 5GHz"] ? item["HT 40MHz | 5GHz"]["Multicast Data"] : ''),
                        '',
                        (item["HT 20MHz | 2GHz"] ? item["HT 20MHz | 2GHz"]["Association"] : ''),
                        (item["HT 20MHz | 2GHz"] ? item["HT 20MHz | 2GHz"]["Unicast ping"] : ''),
                        (item["HT 20MHz | 2GHz"] ? item["HT 20MHz | 2GHz"]["Ping (Bi-Directional)"] : ''),
                        (item["HT 20MHz | 2GHz"] ? item["HT 20MHz | 2GHz"]["Re-association"] : ''),
                        (item["HT 20MHz | 2GHz"] ? item["HT 20MHz | 2GHz"]["TCP Data (Bi-Directional)"] : ''),
                        (item["HT 20MHz | 2GHz"] ? item["HT 20MHz | 2GHz"]["UDP Data (Bi-Directional)"] : ''),
                        (item["HT 20MHz | 2GHz"] ? item["HT 20MHz | 2GHz"]["Broadcast Data"] : ''),
                        (item["HT 20MHz | 2GHz"] ? item["HT 20MHz | 2GHz"]["Multicast Data"] : ''));

                    newRow.push('',
                        (item["STA-Connectivity-IOT Comments"] ? item["STA-Connectivity-IOT Comments"] : ''), '',
                        (item["Additional Details"] ? item["Additional Details"] : ''),
                        (item["2GHz / 5GHz Support"] ? item["2GHz / 5GHz Support"] : ''),
                        (item["11ax Suport"] ? item["11ax Suport"] : ''),
                        (item["11ac 5GHz Support - Wave1"] ? item["11ac 5GHz Support - Wave1"] : ''),
                        (item["11ac 5GHz Support - Wave2"] ? item["11ac 5GHz Support - Wave2"] : ''),
                        (item["Access Point / Client OEM"] ? item["Access Point / Client OEM"] : ''),
                        (item["Device Model"] ? item["Device Model"] : ''),
                        (item["Chipset Vendor"] ? item["Chipset Vendor"] : ''),
                        (item["Category (Enterprise/Retail)"] ? item["Category (Enterprise/Retail)"] : '')
                    );

                    startRow = worksheet.getRow(row_num);
                    for (let index = 0; index < newRow.length; index++) {
                        startRow.getCell(index + 1).value = newRow[index];
                    }
                    row_num += 1;
                    slVal += 1;
                }
                await workbook.xlsx.writeFile(file); // xlsx format generated from the above template
                console.log("file - ", file);
            });
        console.log("file return- ", file);
        return file;
    } catch (err) {
        logger.error("generateIopTpReport : ", err);
    }
}

/*
    Creates a new xlsx excel workbook from the existing Unified All KPI template for given Coex-Simul-Tp-2Intf execution.
*/
async function generateCoexSimulTp2IntfReport(data, executionName) {
    try {
        const workbook = new ExcelJS.Workbook(); // creates a new workbook
        let templateFile = config.public.path + config.public.templates + "Simul-TP-2INTF.xlsx";
        let file = config.public.path + config.public.output + executionName + 'KPI_Report.xlsx';

        await workbook.xlsx.readFile(templateFile)
            .then(async function() {
                let worksheet = workbook.getWorksheet("Simul-TP-2INTF"); // get particular sheet
                let row_num = 8;
                let startRow = worksheet.getRow(row_num);

                for (let item of data) {
                    let newRow = ['', '', ''];
                    worksheet.getRow(8).getCell(1).value = executionName;

                    /* Static column values for Coex-Simul-Tp-2Intf KPI data */
                    newRow.push(item["TP TYPE"], item["DUT"], item["SoC Version"], item["SoC TYPE"], item["DUT Fw/Drv"], item["Interface"], item["SDIO Clock [MHz]"], item["Aggregation"], item["Spatial Streams"], item["Guard Interval"], item["Data Rate"], item["Connectivity Modes"], item["INTF1 | Companion Device 1/Ex-AP/Ex-STA/Ex-P2P-GO/Ex-P2P-GC"],
                        item["INTF1 | Companion Device 1 FW/Drv"], item["INTF2 | Companion Device 1/Ex-AP/Ex-STA/Ex-P2P-GO/Ex-P2P-GC"], item["INTF2 | Companion Device 1 FW/Drv"], item["DUT Host Platform"], item["DUT OS"], item["INTF 1 Configuration"], item["Channel | INTF 1"],
                        item["INTF 2 Configuration"], item["Channel | INTF 2"], item["DRCS Timing Configuration Duty Cycle | INTF1 | INTF2"], item["Misc"], item["Security"], item["BT Ref"], item["Coex mode"], item["ANT isolation"], item["BT profiles"], item["BT/BLE Role"], item["Profile Param"],
                        item["Connection param"], item["BT Sniff"], item["Test Duration"], item["Test Repetition"]);
                    /* Band Mapped column values for Coex-Simul-Tp-2Intf KPI data */
                    newRow.push('',
                        (item["BT Baseline #1"] ? item["BT Baseline #1"] : ''),
                        (item["BT Baseline #2"] ? item["BT Baseline #2"] : ''),
                        (item["BT RSSI"] ? item["BT RSSI"] : ''), '',
                        (item["TCP-RxRx_INTF1"] ? item["TCP-RxRx_INTF1"] : ''),
                        (item["TCP-RxRx_INTF2"] ? item["TCP-RxRx_INTF2"] : ''), '',
                        (item["TCP-RxTx_INTF1"] ? item["TCP-RxTx_INTF1"] : ''),
                        (item["TCP-RxTx_INTF2"] ? item["TCP-RxTx_INTF2"] : ''), '',
                        (item["TCP-TxRx_INTF1"] ? item["TCP-TxRx_INTF1"] : ''),
                        (item["TCP-TxRx_INTF2"] ? item["TCP-TxRx_INTF2"] : ''), '',
                        (item["TCP-TxTx_INTF1"] ? item["TCP-TxTx_INTF1"] : ''),
                        (item["TCP-TxTx_INTF2"] ? item["TCP-TxTx_INTF2"] : ''), '',
                        (item["UDP-RxRx_INTF1"] ? item["UDP-RxRx_INTF1"] : ''),
                        (item["UDP-RxRx_INTF2"] ? item["UDP-RxRx_INTF2"] : ''), '',
                        (item["UDP-RxTx_INTF1"] ? item["UDP-RxTx_INTF1"] : ''),
                        (item["UDP-RxTx_INTF2"] ? item["UDP-RxTx_INTF2"] : ''), '',
                        (item["UDP-TxRx_INTF1"] ? item["UDP-TxRx_INTF1"] : ''),
                        (item["UDP-TxRx_INTF2"] ? item["UDP-TxRx_INTF2"] : ''), '',
                        (item["UDP-TxTx_INTF1"] ? item["UDP-TxTx_INTF1"] : ''),
                        (item["UDP-TxTx_INTF2"] ? item["UDP-TxTx_INTF2"] : ''),
                        (item["Wi-Fi Intf 1 RSSI"] ? item["Wi-Fi Intf 1 RSSI"] : ''),
                        (item["Wi-Fi Intf 2 RSSI"] ? item["Wi-Fi Intf 2 RSSI"] : ''));

                    if ((typeof item["TCP Coex Performance"] != 'undefined') && (typeof item["UDP Coex Performance"] != 'undefined')) {
                        newRow.push('', (item["TCP Coex Performance"]["TxTx"] ? item["TCP Coex Performance"]["TxTx"]["INTF1"] : ''),
                            (item["TCP Coex Performance"]["TxTx"] ? item["TCP Coex Performance"]["TxTx"]["INTF2"] : ''),
                            (item["TCP Coex Performance"]["TxTx"] ? item["TCP Coex Performance"]["TxTx"]["BT Performance Result#1"] : ''),
                            (item["TCP Coex Performance"]["TxTx"] ? item["TCP Coex Performance"]["TxTx"]["BT Performance Result#2"] : ''),
                            '',
                            (item["TCP Coex Performance"]["TxRx"] ? item["TCP Coex Performance"]["TxRx"]["INTF1"] : ''),
                            (item["TCP Coex Performance"]["TxRx"] ? item["TCP Coex Performance"]["TxRx"]["INTF2"] : ''),
                            (item["TCP Coex Performance"]["TxRx"] ? item["TCP Coex Performance"]["TxRx"]["BT Performance Result#1"] : ''),
                            (item["TCP Coex Performance"]["TxRx"] ? item["TCP Coex Performance"]["TxRx"]["BT Performance Result#2"] : ''),
                            '', (item["TCP Coex Performance"]["RxTx"] ? item["TCP Coex Performance"]["RxTx"]["INTF1"] : ''),
                            (item["TCP Coex Performance"]["RxTx"] ? item["TCP Coex Performance"]["RxTx"]["INTF2"] : ''),
                            (item["TCP Coex Performance"]["RxTx"] ? item["TCP Coex Performance"]["RxTx"]["BT Performance Result#1"] : ''),
                            (item["TCP Coex Performance"]["RxTx"] ? item["TCP Coex Performance"]["RxTx"]["BT Performance Result#2"] : ''),
                            '', (item["TCP Coex Performance"]["RxRx"] ? item["TCP Coex Performance"]["RxRx"]["INTF1"] : ''),
                            (item["TCP Coex Performance"]["RxRx"] ? item["TCP Coex Performance"]["RxRx"]["INTF2"] : ''),
                            (item["TCP Coex Performance"]["RxRx"] ? item["TCP Coex Performance"]["RxRx"]["BT Performance Result#1"] : ''),
                            (item["TCP Coex Performance"]["RxRx"] ? item["TCP Coex Performance"]["RxRx"]["BT Performance Result#2"] : ''),
                            '', (item["UDP Coex Performance"]["TxTx"] ? item["UDP Coex Performance"]["TxTx"]["INTF1"] : ''),
                            (item["UDP Coex Performance"]["TxTx"] ? item["UDP Coex Performance"]["TxTx"]["INTF2"] : ''),
                            (item["UDP Coex Performance"]["TxTx"] ? item["UDP Coex Performance"]["TxTx"]["BT Performance Result#1"] : ''),
                            (item["UDP Coex Performance"]["TxTx"] ? item["UDP Coex Performance"]["TxTx"]["BT Performance Result#2"] : ''),
                            '', (item["UDP Coex Performance"]["TxRx"] ? item["UDP Coex Performance"]["TxRx"]["INTF1"] : ''),
                            (item["UDP Coex Performance"]["TxRx"] ? item["UDP Coex Performance"]["TxRx"]["INTF2"] : ''),
                            (item["UDP Coex Performance"]["TxRx"] ? item["UDP Coex Performance"]["TxRx"]["BT Performance Result#1"] : ''),
                            (item["UDP Coex Performance"]["TxRx"] ? item["UDP Coex Performance"]["TxRx"]["BT Performance Result#2"] : ''),
                            '', (item["UDP Coex Performance"]["RxTx"] ? item["UDP Coex Performance"]["RxTx"]["INTF1"] : ''),
                            (item["UDP Coex Performance"]["RxTx"] ? item["UDP Coex Performance"]["RxTx"]["INTF2"] : ''),
                            (item["UDP Coex Performance"]["RxTx"] ? item["UDP Coex Performance"]["RxTx"]["BT Performance Result#1"] : ''),
                            (item["UDP Coex Performance"]["RxTx"] ? item["UDP Coex Performance"]["RxTx"]["BT Performance Result#2"] : ''),
                            '', (item["UDP Coex Performance"]["RxRx"] ? item["UDP Coex Performance"]["RxRx"]["INTF1"] : ''),
                            (item["UDP Coex Performance"]["RxRx"] ? item["UDP Coex Performance"]["RxRx"]["INTF2"] : ''),
                            (item["UDP Coex Performance"]["RxRx"] ? item["UDP Coex Performance"]["RxRx"]["BT Performance Result#1"] : ''),
                            (item["UDP Coex Performance"]["RxRx"] ? item["UDP Coex Performance"]["RxRx"]["BT Performance Result#2"] : ''));

                    } else if (typeof item["TCP Coex Performance"] != 'undefined') {
                        newRow.push('', (item["TCP Coex Performance"]["TxTx"] ? item["TCP Coex Performance"]["TxTx"]["INTF1"] : ''), (item["TCP Coex Performance"]["TxTx"] ? item["TCP Coex Performance"]["TxTx"]["INTF2"] : ''), (item["TCP Coex Performance"]["TxTx"] ? item["TCP Coex Performance"]["TxTx"]["BT Performance Result#1"] : ''), (item["TCP Coex Performance"]["TxTx"] ? item["TCP Coex Performance"]["TxTx"]["BT Performance Result#2"] : ''),
                            '', (item["TCP Coex Performance"]["TxRx"] ? item["TCP Coex Performance"]["TxRx"]["INTF1"] : ''), (item["TCP Coex Performance"]["TxRx"] ? item["TCP Coex Performance"]["TxRx"]["INTF2"] : ''), (item["TCP Coex Performance"]["TxRx"] ? item["TCP Coex Performance"]["TxRx"]["BT Performance Result#1"] : ''), (item["TCP Coex Performance"]["TxRx"] ? item["TCP Coex Performance"]["TxRx"]["BT Performance Result#2"] : ''),
                            '', (item["TCP Coex Performance"]["RxTx"] ? item["TCP Coex Performance"]["RxTx"]["INTF1"] : ''), (item["TCP Coex Performance"]["RxTx"] ? item["TCP Coex Performance"]["RxTx"]["INTF2"] : ''), (item["TCP Coex Performance"]["RxTx"] ? item["TCP Coex Performance"]["RxTx"]["BT Performance Result#1"] : ''), (item["TCP Coex Performance"]["RxTx"] ? item["TCP Coex Performance"]["RxTx"]["BT Performance Result#2"] : ''),
                            '', (item["TCP Coex Performance"]["RxRx"] ? item["TCP Coex Performance"]["RxRx"]["INTF1"] : ''), (item["TCP Coex Performance"]["RxRx"] ? item["TCP Coex Performance"]["RxRx"]["INTF2"] : ''), (item["TCP Coex Performance"]["RxRx"] ? item["TCP Coex Performance"]["RxRx"]["BT Performance Result#1"] : ''), (item["TCP Coex Performance"]["RxRx"] ? item["TCP Coex Performance"]["RxRx"]["BT Performance Result#2"] : ''), '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '');
                    } else {
                        newRow.push('', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', (item["UDP Coex Performance"]["TxTx"] ? item["UDP Coex Performance"]["TxTx"]["INTF1"] : ''), (item["UDP Coex Performance"]["TxTx"] ? item["UDP Coex Performance"]["TxTx"]["INTF2"] : ''), (item["UDP Coex Performance"]["TxTx"] ? item["UDP Coex Performance"]["TxTx"]["BT Performance Result#1"] : ''), (item["UDP Coex Performance"]["TxTx"] ? item["UDP Coex Performance"]["TxTx"]["BT Performance Result#2"] : ''),
                            '', (item["UDP Coex Performance"]["TxRx"] ? item["UDP Coex Performance"]["TxRx"]["INTF1"] : ''), (item["UDP Coex Performance"]["TxRx"] ? item["UDP Coex Performance"]["TxRx"]["INTF2"] : ''), (item["UDP Coex Performance"]["TxRx"] ? item["UDP Coex Performance"]["TxRx"]["BT Performance Result#1"] : ''), (item["UDP Coex Performance"]["TxRx"] ? item["UDP Coex Performance"]["TxRx"]["BT Performance Result#2"] : ''),
                            '', (item["UDP Coex Performance"]["RxTx"] ? item["UDP Coex Performance"]["RxTx"]["INTF1"] : ''), (item["UDP Coex Performance"]["RxTx"] ? item["UDP Coex Performance"]["RxTx"]["INTF2"] : ''), (item["UDP Coex Performance"]["RxTx"] ? item["UDP Coex Performance"]["RxTx"]["BT Performance Result#1"] : ''), (item["UDP Coex Performance"]["RxTx"] ? item["UDP Coex Performance"]["RxTx"]["BT Performance Result#2"] : ''),
                            '', (item["UDP Coex Performance"]["RxRx"] ? item["UDP Coex Performance"]["RxRx"]["INTF1"] : ''), (item["UDP Coex Performance"]["RxRx"] ? item["UDP Coex Performance"]["RxRx"]["INTF2"] : ''), (item["UDP Coex Performance"]["RxRx"] ? item["UDP Coex Performance"]["RxRx"]["BT Performance Result#1"] : ''), (item["UDP Coex Performance"]["RxRx"] ? item["UDP Coex Performance"]["RxRx"]["BT Performance Result#2"] : ''));
                    }

                    newRow.push(
                        (item["BT_RSSI"] ? item["BT_RSSI"] : ''),
                        (item["Wi-Fi Intf_1 RSSI"] ? item["Wi-Fi Intf_1 RSSI"] : ''),
                        (item["Wi-Fi Intf_2 RSSI"] ? item["Wi-Fi Intf_2 RSSI"] : ''), '', item["Comments"]);

                    startRow = worksheet.getRow(row_num);
                    for (let index = 0; index < newRow.length; index++) {
                        startRow.getCell(index + 1).value = newRow[index];
                    }
                    row_num += 1;
                }
                await workbook.xlsx.writeFile(file); // xlsx format generated from the above template
                console.log("file - ", file);
            });
        console.log("file return- ", file);
        return file;
    } catch (err) {
        logger.error("generateCoexSimulTp2IntfReport : ", err);
    }
}

/*
    Creates a new xlsx excel workbook from the existing Unified All KPI template for given Coex-Simul-Tp-3Intf execution.
*/
async function generateCoexSimulTp3IntfReport(data, executionName) {
    try {
        const workbook = new ExcelJS.Workbook(); // creates a new workbook
        let templateFile = config.public.path + config.public.templates + "Simul-TP-3INTF.xlsx";
        let file = config.public.path + config.public.output + executionName + 'KPI_Report.xlsx';

        await workbook.xlsx.readFile(templateFile)
            .then(async function() {
                let worksheet = workbook.getWorksheet("Simul-TP-3INTF"); // get particular sheet
                let row_num = 8;
                let startRow = worksheet.getRow(row_num);

                for (let item of data) {
                    let newRow = ['', '', ''];
                    worksheet.getRow(8).getCell(1).value = executionName;

                    /* Static column values for Coex-Simul-Tp-3Intf KPI data */
                    newRow.push(item["TP TYPE"], item["DUT"], item["SoC Version"], item["SoC TYPE"], item["DUT Fw/Drv"], item["Interface"], item["SDIO Clock [MHz]"], item["Aggregation"], item["Spatial Streams"], item["Guard Interval"], item["Data Rate"], item["Connectivity Modes"], item["Companion Device 1/Ex-AP/Ex-STA/Ex-P2P-GO/Ex-P2P-GC"],
                        item["Companion Device 1 FW/Drv"], item["Companion Device 2/Ex-AP/Ex-STA/Ex-P2P-GO/Ex-P2P-GC"], item["Companion Device 2 FW/Drv"], item["Companion Device 3/Ex-AP/Ex-STA/Ex-P2P-GO/Ex-P2P-GC"], item["Companion Device 3 FW/Drv"], item["DUT Host Platform"], item["DUT OS"], item["INTF 1 Configuration"], item["Channel | INTF 1"],
                        item["INTF 2 Configuration"], item["Channel | INTF 2"], item["INTF 3 Configuration"], item["Channel | INTF 3"], item["DRCS Timing Configuration Duty Cycle | INTF1 | INTF2"], item["Misc"], item["Security"], item["BT Ref"], item["Coex mode"], item["ANT isolation"], item["BT profiles"], item["BT/BLE Role"], item["Profile Param"],
                        item["Connection param"], item["BT Sniff"], item["Test Duration"], item["Test Repetition"]);
                    /* Band Mapped column values for Coex-Simul-Tp-3Intf KPI data */
                    newRow.push('', (item["BT Baseline"] ? item["BT Baseline"]["BT Baseline #1"] : ''), (item["BT Baseline"] ? item["BT Baseline"]["BT Baseline #2"] : ''), (item["BT Baseline"] ? item["BT Baseline"]["BT RSSI"] : ''),
                        '', (item["TCP Baseline"] ? item["TCP Baseline"]["TxTxTx"]["INTF1"] : ''), (item["TCP Baseline"] ? item["TCP Baseline"]["TxTxTx"]["INTF2"] : ''), (item["TCP Baseline"] ? item["TCP Baseline"]["TxTxTx"]["INTF3"] : ''), '', (item["TCP Baseline"] ? item["TCP Baseline"]["TxTxRx"]["INTF1"] : ''), (item["TCP Baseline"] ? item["TCP Baseline"]["TxTxRx"]["INTF2"] : ''), (item["TCP Baseline"] ? item["TCP Baseline"]["TxTxRx"]["INTF3"] : ''), '', (item["TCP Baseline"] ? item["TCP Baseline"]["TxRxTx"]["INTF1"] : ''), (item["TCP Baseline"] ? item["TCP Baseline"]["TxRxTx"]["INTF2"] : ''), (item["TCP Baseline"] ? item["TCP Baseline"]["TxRxTx"]["INTF3"] : ''), '', (item["TCP Baseline"] ? item["TCP Baseline"]["TxRxRx"]["INTF1"] : ''), (item["TCP Baseline"] ? item["TCP Baseline"]["TxRxRx"]["INTF2"] : ''), (item["TCP Baseline"] ? item["TCP Baseline"]["TxRxRx"]["INTF3"] : ''), '', (item["TCP Baseline"] ? item["TCP Baseline"]["RxTxTx"]["INTF1"] : ''), (item["TCP Baseline"] ? item["TCP Baseline"]["RxTxTx"]["INTF2"] : ''), (item["TCP Baseline"] ? item["TCP Baseline"]["RxTxTx"]["INTF3"] : ''), '', (item["TCP Baseline"] ? item["TCP Baseline"]["RxTxRx"]["INTF1"] : ''), (item["TCP Baseline"] ? item["TCP Baseline"]["RxTxRx"]["INTF2"] : ''), (item["TCP Baseline"] ? item["TCP Baseline"]["RxTxRx"]["INTF3"] : ''), '', (item["TCP Baseline"] ? item["TCP Baseline"]["RxRxTx"]["INTF1"] : ''), (item["TCP Baseline"] ? item["TCP Baseline"]["RxRxTx"]["INTF2"] : ''), (item["TCP Baseline"] ? item["TCP Baseline"]["RxRxTx"]["INTF3"] : ''), '', (item["TCP Baseline"] ? item["TCP Baseline"]["RxRxRx"]["INTF1"] : ''), (item["TCP Baseline"] ? item["TCP Baseline"]["RxRxRx"]["INTF2"] : ''), (item["TCP Baseline"] ? item["TCP Baseline"]["RxRxRx"]["INTF3"] : ''),
                        '', (item["UDP Baseline"] ? item["UDP Baseline"]["TxTxTx"]["INTF1"] : ''), (item["UDP Baseline"] ? item["UDP Baseline"]["TxTxTx"]["INTF2"] : ''), (item["UDP Baseline"] ? item["UDP Baseline"]["TxTxTx"]["INTF3"] : ''), '', (item["UDP Baseline"] ? item["UDP Baseline"]["TxTxRx"]["INTF1"] : ''), (item["UDP Baseline"] ? item["UDP Baseline"]["TxTxRx"]["INTF2"] : ''), (item["UDP Baseline"] ? item["UDP Baseline"]["TxTxRx"]["INTF3"] : ''), '', (item["UDP Baseline"] ? item["UDP Baseline"]["TxRxTx"]["INTF1"] : ''), (item["UDP Baseline"] ? item["UDP Baseline"]["TxRxTx"]["INTF2"] : ''), (item["UDP Baseline"] ? item["UDP Baseline"]["TxRxTx"]["INTF3"] : ''), '', (item["UDP Baseline"] ? item["UDP Baseline"]["TxRxRx"]["INTF1"] : ''), (item["UDP Baseline"] ? item["UDP Baseline"]["TxRxRx"]["INTF2"] : ''), (item["UDP Baseline"] ? item["UDP Baseline"]["TxRxRx"]["INTF3"] : ''), '', (item["UDP Baseline"] ? item["UDP Baseline"]["RxTxTx"]["INTF1"] : ''), (item["UDP Baseline"] ? item["UDP Baseline"]["RxTxTx"]["INTF2"] : ''), (item["UDP Baseline"] ? item["UDP Baseline"]["RxTxTx"]["INTF3"] : ''), '', (item["UDP Baseline"] ? item["UDP Baseline"]["RxTxRx"]["INTF1"] : ''), (item["UDP Baseline"] ? item["UDP Baseline"]["RxTxRx"]["INTF2"] : ''), (item["UDP Baseline"] ? item["UDP Baseline"]["RxTxRx"]["INTF3"] : ''), '', (item["UDP Baseline"] ? item["UDP Baseline"]["RxRxTx"]["INTF1"] : ''), (item["UDP Baseline"] ? item["UDP Baseline"]["RxRxTx"]["INTF2"] : ''), (item["UDP Baseline"] ? item["UDP Baseline"]["RxRxTx"]["INTF3"] : ''), '', (item["UDP Baseline"] ? item["UDP Baseline"]["RxRxRx"]["INTF1"] : ''), (item["UDP Baseline"] ? item["UDP Baseline"]["RxRxRx"]["INTF2"] : ''), (item["UDP Baseline"] ? item["UDP Baseline"]["RxRxRx"]["INTF3"] : ''),
                        (item["RSSI"] ? item["RSSI"]["Wi-Fi Intf 1 RSSI"] : ''), (item["RSSI"] ? item["RSSI"]["Wi-Fi Intf 2 RSSI"] : ''), (item["RSSI"] ? item["RSSI"]["Wi-Fi Intf 3 RSSI"] : ''));
                    if ((typeof item["TCP Coex Performance"] != 'undefined') && (typeof item["UDP Coex Performance"] != 'undefined')) {
                        newRow.push('', (item["TCP Coex Performance"]["TXTXTX"] ? item["TCP Coex Performance"]["TXTXTX"]["INTF1"] : ''), (item["TCP Coex Performance"]["TXTXTX"] ? item["TCP Coex Performance"]["TXTXTX"]["INTF2"] : ''), (item["TCP Coex Performance"]["TXTXTX"] ? item["TCP Coex Performance"]["TXTXTX"]["INTF2"] : ''), (item["TCP Coex Performance"]["TXTXTX"] ? item["TCP Coex Performance"]["TXTXTX"]["BT Performance Result#1"] : ''), (item["TCP Coex Performance"]["TXTXTX"] ? item["TCP Coex Performance"]["TXTXTX"]["BT Performance Result#2"] : ''),
                            '', (item["TCP Coex Performance"]["TXTXRX"] ? item["TCP Coex Performance"]["TXTXRX"]["INTF1"] : ''), (item["TCP Coex Performance"]["TXTXRX"] ? item["TCP Coex Performance"]["TXTXRX"]["INTF2"] : ''), (item["TCP Coex Performance"]["TXTXRX"] ? item["TCP Coex Performance"]["TXTXRX"]["INTF2"] : ''), (item["TCP Coex Performance"]["TXTXRX"] ? item["TCP Coex Performance"]["TXTXRX"]["BT Performance Result#1"] : ''), (item["TCP Coex Performance"]["TXTXRX"] ? item["TCP Coex Performance"]["TXTXRX"]["BT Performance Result#2"] : ''),
                            '', (item["TCP Coex Performance"]["TXRXTX"] ? item["TCP Coex Performance"]["TXRXTX"]["INTF1"] : ''), (item["TCP Coex Performance"]["TXRXTX"] ? item["TCP Coex Performance"]["TXRXTX"]["INTF2"] : ''), (item["TCP Coex Performance"]["TXRXTX"] ? item["TCP Coex Performance"]["TXRXTX"]["INTF2"] : ''), (item["TCP Coex Performance"]["TXRXTX"] ? item["TCP Coex Performance"]["TXRXTX"]["BT Performance Result#1"] : ''), (item["TCP Coex Performance"]["TXRXTX"] ? item["TCP Coex Performance"]["TXRXTX"]["BT Performance Result#2"] : ''),
                            '', (item["TCP Coex Performance"]["TXRXRX"] ? item["TCP Coex Performance"]["TXRXRX"]["INTF1"] : ''), (item["TCP Coex Performance"]["TXRXRX"] ? item["TCP Coex Performance"]["TXRXRX"]["INTF2"] : ''), (item["TCP Coex Performance"]["TXRXRX"] ? item["TCP Coex Performance"]["TXRXRX"]["INTF2"] : ''), (item["TCP Coex Performance"]["TXRXRX"] ? item["TCP Coex Performance"]["TXRXRX"]["BT Performance Result#1"] : ''), (item["TCP Coex Performance"]["TXRXRX"] ? item["TCP Coex Performance"]["TXRXRX"]["BT Performance Result#2"] : ''),
                            '', (item["TCP Coex Performance"]["RXTXTX"] ? item["TCP Coex Performance"]["RXTXTX"]["INTF1"] : ''), (item["TCP Coex Performance"]["RXTXTX"] ? item["TCP Coex Performance"]["RXTXTX"]["INTF2"] : ''), (item["TCP Coex Performance"]["RXTXTX"] ? item["TCP Coex Performance"]["RXTXTX"]["INTF2"] : ''), (item["TCP Coex Performance"]["RXTXTX"] ? item["TCP Coex Performance"]["RXTXTX"]["BT Performance Result#1"] : ''), (item["TCP Coex Performance"]["RXTXTX"] ? item["TCP Coex Performance"]["RXTXTX"]["BT Performance Result#2"] : ''),
                            '', (item["TCP Coex Performance"]["RXTXRX"] ? item["TCP Coex Performance"]["RXTXRX"]["INTF1"] : ''), (item["TCP Coex Performance"]["RXTXRX"] ? item["TCP Coex Performance"]["RXTXRX"]["INTF2"] : ''), (item["TCP Coex Performance"]["RXTXRX"] ? item["TCP Coex Performance"]["RXTXRX"]["INTF2"] : ''), (item["TCP Coex Performance"]["RXTXRX"] ? item["TCP Coex Performance"]["RXTXRX"]["BT Performance Result#1"] : ''), (item["TCP Coex Performance"]["RXTXRX"] ? item["TCP Coex Performance"]["RXTXRX"]["BT Performance Result#2"] : ''),
                            '', (item["TCP Coex Performance"]["RXRXTX"] ? item["TCP Coex Performance"]["RXRXTX"]["INTF1"] : ''), (item["TCP Coex Performance"]["RXRXTX"] ? item["TCP Coex Performance"]["RXRXTX"]["INTF2"] : ''), (item["TCP Coex Performance"]["RXRXTX"] ? item["TCP Coex Performance"]["RXRXTX"]["INTF2"] : ''), (item["TCP Coex Performance"]["RXRXTX"] ? item["TCP Coex Performance"]["RXRXTX"]["BT Performance Result#1"] : ''), (item["TCP Coex Performance"]["RXRXTX"] ? item["TCP Coex Performance"]["RXRXTX"]["BT Performance Result#2"] : ''),
                            '', (item["TCP Coex Performance"]["RXRXRX"] ? item["TCP Coex Performance"]["RXRXRX"]["INTF1"] : ''), (item["TCP Coex Performance"]["RXRXRX"] ? item["TCP Coex Performance"]["RXRXRX"]["INTF2"] : ''), (item["TCP Coex Performance"]["RXRXRX"] ? item["TCP Coex Performance"]["RXRXRX"]["INTF2"] : ''), (item["TCP Coex Performance"]["RXRXRX"] ? item["TCP Coex Performance"]["RXRXRX"]["BT Performance Result#1"] : ''), (item["TCP Coex Performance"]["RXRXRX"] ? item["TCP Coex Performance"]["RXRXRX"]["BT Performance Result#2"] : ''),
                            '', (item["UDP Coex Performance"]["TXTXTX"] ? item["UDP Coex Performance"]["TXTXTX"]["INTF1"] : ''), (item["UDP Coex Performance"]["TXTXTX"] ? item["UDP Coex Performance"]["TXTXTX"]["INTF2"] : ''), (item["UDP Coex Performance"]["TXTXTX"] ? item["UDP Coex Performance"]["TXTXTX"]["INTF2"] : ''), (item["UDP Coex Performance"]["TXTXTX"] ? item["UDP Coex Performance"]["TXTXTX"]["BT Performance Result#1"] : ''), (item["UDP Coex Performance"]["TXTXTX"] ? item["UDP Coex Performance"]["TXTXTX"]["BT Performance Result#2"] : ''),
                            '', (item["UDP Coex Performance"]["TXTXRX"] ? item["UDP Coex Performance"]["TXTXRX"]["INTF1"] : ''), (item["UDP Coex Performance"]["TXTXRX"] ? item["UDP Coex Performance"]["TXTXRX"]["INTF2"] : ''), (item["UDP Coex Performance"]["TXTXRX"] ? item["UDP Coex Performance"]["TXTXRX"]["INTF2"] : ''), (item["UDP Coex Performance"]["TXTXRX"] ? item["UDP Coex Performance"]["TXTXRX"]["BT Performance Result#1"] : ''), (item["UDP Coex Performance"]["TXTXRX"] ? item["UDP Coex Performance"]["TXTXRX"]["BT Performance Result#2"] : ''),
                            '', (item["UDP Coex Performance"]["TXRXTX"] ? item["UDP Coex Performance"]["TXRXTX"]["INTF1"] : ''), (item["UDP Coex Performance"]["TXRXTX"] ? item["UDP Coex Performance"]["TXRXTX"]["INTF2"] : ''), (item["UDP Coex Performance"]["TXRXTX"] ? item["UDP Coex Performance"]["TXRXTX"]["INTF2"] : ''), (item["UDP Coex Performance"]["TXRXTX"] ? item["UDP Coex Performance"]["TXRXTX"]["BT Performance Result#1"] : ''), (item["UDP Coex Performance"]["TXRXTX"] ? item["UDP Coex Performance"]["TXRXTX"]["BT Performance Result#2"] : ''),
                            '', (item["UDP Coex Performance"]["TXRXRX"] ? item["UDP Coex Performance"]["TXRXRX"]["INTF1"] : ''), (item["UDP Coex Performance"]["TXRXRX"] ? item["UDP Coex Performance"]["TXRXRX"]["INTF2"] : ''), (item["UDP Coex Performance"]["TXRXRX"] ? item["UDP Coex Performance"]["TXRXRX"]["INTF2"] : ''), (item["UDP Coex Performance"]["TXRXRX"] ? item["UDP Coex Performance"]["TXRXRX"]["BT Performance Result#1"] : ''), (item["UDP Coex Performance"]["TXRXRX"] ? item["UDP Coex Performance"]["TXRXRX"]["BT Performance Result#2"] : ''),
                            '', (item["UDP Coex Performance"]["RXTXTX"] ? item["UDP Coex Performance"]["RXTXTX"]["INTF1"] : ''), (item["UDP Coex Performance"]["RXTXTX"] ? item["UDP Coex Performance"]["RXTXTX"]["INTF2"] : ''), (item["UDP Coex Performance"]["RXTXTX"] ? item["UDP Coex Performance"]["RXTXTX"]["INTF2"] : ''), (item["UDP Coex Performance"]["RXTXTX"] ? item["UDP Coex Performance"]["RXTXTX"]["BT Performance Result#1"] : ''), (item["UDP Coex Performance"]["RXTXTX"] ? item["UDP Coex Performance"]["RXTXTX"]["BT Performance Result#2"] : ''),
                            '', (item["UDP Coex Performance"]["RXTXRX"] ? item["UDP Coex Performance"]["RXTXRX"]["INTF1"] : ''), (item["UDP Coex Performance"]["RXTXRX"] ? item["UDP Coex Performance"]["RXTXRX"]["INTF2"] : ''), (item["UDP Coex Performance"]["RXTXRX"] ? item["UDP Coex Performance"]["RXTXRX"]["INTF2"] : ''), (item["UDP Coex Performance"]["RXTXRX"] ? item["UDP Coex Performance"]["RXTXRX"]["BT Performance Result#1"] : ''), (item["UDP Coex Performance"]["RXTXRX"] ? item["UDP Coex Performance"]["RXTXRX"]["BT Performance Result#2"] : ''),
                            '', (item["UDP Coex Performance"]["RXRXTX"] ? item["UDP Coex Performance"]["RXRXTX"]["INTF1"] : ''), (item["UDP Coex Performance"]["RXRXTX"] ? item["UDP Coex Performance"]["RXRXTX"]["INTF2"] : ''), (item["UDP Coex Performance"]["RXRXTX"] ? item["UDP Coex Performance"]["RXRXTX"]["INTF2"] : ''), (item["UDP Coex Performance"]["RXRXTX"] ? item["UDP Coex Performance"]["RXRXTX"]["BT Performance Result#1"] : ''), (item["UDP Coex Performance"]["RXRXTX"] ? item["UDP Coex Performance"]["RXRXTX"]["BT Performance Result#2"] : ''),
                            '', (item["UDP Coex Performance"]["RXRXRX"] ? item["UDP Coex Performance"]["RXRXRX"]["INTF1"] : ''), (item["UDP Coex Performance"]["RXRXRX"] ? item["UDP Coex Performance"]["RXRXRX"]["INTF2"] : ''), (item["UDP Coex Performance"]["RXRXRX"] ? item["UDP Coex Performance"]["RXRXRX"]["INTF2"] : ''), (item["UDP Coex Performance"]["RXRXRX"] ? item["UDP Coex Performance"]["RXRXRX"]["BT Performance Result#1"] : ''), (item["UDP Coex Performance"]["RXRXRX"] ? item["UDP Coex Performance"]["RXRXRX"]["BT Performance Result#2"] : ''));
                    } else if (typeof item["TCP Coex Performance"] != 'undefined') {
                        newRow.push('', (item["TCP Coex Performance"]["TXTXTX"] ? item["TCP Coex Performance"]["TXTXTX"]["INTF1"] : ''), (item["TCP Coex Performance"]["TXTXTX"] ? item["TCP Coex Performance"]["TXTXTX"]["INTF2"] : ''), (item["TCP Coex Performance"]["TXTXTX"] ? item["TCP Coex Performance"]["TXTXTX"]["INTF2"] : ''), (item["TCP Coex Performance"]["TXTXTX"] ? item["TCP Coex Performance"]["TXTXTX"]["BT Performance Result#1"] : ''), (item["TCP Coex Performance"]["TXTXTX"] ? item["TCP Coex Performance"]["TXTXTX"]["BT Performance Result#2"] : ''),
                            '', (item["TCP Coex Performance"]["TXTXRX"] ? item["TCP Coex Performance"]["TXTXRX"]["INTF1"] : ''), (item["TCP Coex Performance"]["TXTXRX"] ? item["TCP Coex Performance"]["TXTXRX"]["INTF2"] : ''), (item["TCP Coex Performance"]["TXTXRX"] ? item["TCP Coex Performance"]["TXTXRX"]["INTF2"] : ''), (item["TCP Coex Performance"]["TXTXRX"] ? item["TCP Coex Performance"]["TXTXRX"]["BT Performance Result#1"] : ''), (item["TCP Coex Performance"]["TXTXRX"] ? item["TCP Coex Performance"]["TXTXRX"]["BT Performance Result#2"] : ''),
                            '', (item["TCP Coex Performance"]["TXRXTX"] ? item["TCP Coex Performance"]["TXRXTX"]["INTF1"] : ''), (item["TCP Coex Performance"]["TXRXTX"] ? item["TCP Coex Performance"]["TXRXTX"]["INTF2"] : ''), (item["TCP Coex Performance"]["TXRXTX"] ? item["TCP Coex Performance"]["TXRXTX"]["INTF2"] : ''), (item["TCP Coex Performance"]["TXRXTX"] ? item["TCP Coex Performance"]["TXRXTX"]["BT Performance Result#1"] : ''), (item["TCP Coex Performance"]["TXRXTX"] ? item["TCP Coex Performance"]["TXRXTX"]["BT Performance Result#2"] : ''),
                            '', (item["TCP Coex Performance"]["TXRXRX"] ? item["TCP Coex Performance"]["TXRXRX"]["INTF1"] : ''), (item["TCP Coex Performance"]["TXRXRX"] ? item["TCP Coex Performance"]["TXRXRX"]["INTF2"] : ''), (item["TCP Coex Performance"]["TXRXRX"] ? item["TCP Coex Performance"]["TXRXRX"]["INTF2"] : ''), (item["TCP Coex Performance"]["TXRXRX"] ? item["TCP Coex Performance"]["TXRXRX"]["BT Performance Result#1"] : ''), (item["TCP Coex Performance"]["TXRXRX"] ? item["TCP Coex Performance"]["TXRXRX"]["BT Performance Result#2"] : ''),
                            '', (item["TCP Coex Performance"]["RXTXTX"] ? item["TCP Coex Performance"]["RXTXTX"]["INTF1"] : ''), (item["TCP Coex Performance"]["RXTXTX"] ? item["TCP Coex Performance"]["RXTXTX"]["INTF2"] : ''), (item["TCP Coex Performance"]["RXTXTX"] ? item["TCP Coex Performance"]["RXTXTX"]["INTF2"] : ''), (item["TCP Coex Performance"]["RXTXTX"] ? item["TCP Coex Performance"]["RXTXTX"]["BT Performance Result#1"] : ''), (item["TCP Coex Performance"]["RXTXTX"] ? item["TCP Coex Performance"]["RXTXTX"]["BT Performance Result#2"] : ''),
                            '', (item["TCP Coex Performance"]["RXTXRX"] ? item["TCP Coex Performance"]["RXTXRX"]["INTF1"] : ''), (item["TCP Coex Performance"]["RXTXRX"] ? item["TCP Coex Performance"]["RXTXRX"]["INTF2"] : ''), (item["TCP Coex Performance"]["RXTXRX"] ? item["TCP Coex Performance"]["RXTXRX"]["INTF2"] : ''), (item["TCP Coex Performance"]["RXTXRX"] ? item["TCP Coex Performance"]["RXTXRX"]["BT Performance Result#1"] : ''), (item["TCP Coex Performance"]["RXTXRX"] ? item["TCP Coex Performance"]["RXTXRX"]["BT Performance Result#2"] : ''),
                            '', (item["TCP Coex Performance"]["RXRXTX"] ? item["TCP Coex Performance"]["RXRXTX"]["INTF1"] : ''), (item["TCP Coex Performance"]["RXRXTX"] ? item["TCP Coex Performance"]["RXRXTX"]["INTF2"] : ''), (item["TCP Coex Performance"]["RXRXTX"] ? item["TCP Coex Performance"]["RXRXTX"]["INTF2"] : ''), (item["TCP Coex Performance"]["RXRXTX"] ? item["TCP Coex Performance"]["RXRXTX"]["BT Performance Result#1"] : ''), (item["TCP Coex Performance"]["RXRXTX"] ? item["TCP Coex Performance"]["RXRXTX"]["BT Performance Result#2"] : ''),
                            '', (item["TCP Coex Performance"]["RXRXRX"] ? item["TCP Coex Performance"]["RXRXRX"]["INTF1"] : ''), (item["TCP Coex Performance"]["RXRXRX"] ? item["TCP Coex Performance"]["RXRXRX"]["INTF2"] : ''), (item["TCP Coex Performance"]["RXRXRX"] ? item["TCP Coex Performance"]["RXRXRX"]["INTF2"] : ''), (item["TCP Coex Performance"]["RXRXRX"] ? item["TCP Coex Performance"]["RXRXRX"]["BT Performance Result#1"] : ''), (item["TCP Coex Performance"]["RXRXRX"] ? item["TCP Coex Performance"]["RXRXRX"]["BT Performance Result#2"] : ''),
                            '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '');
                    } else {
                        newRow.push('', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', (item["UDP Coex Performance"]["TXTXTX"] ? item["UDP Coex Performance"]["TXTXTX"]["INTF1"] : ''), (item["UDP Coex Performance"]["TXTXTX"] ? item["UDP Coex Performance"]["TXTXTX"]["INTF2"] : ''), (item["UDP Coex Performance"]["TXTXTX"] ? item["UDP Coex Performance"]["TXTXTX"]["INTF2"] : ''), (item["UDP Coex Performance"]["TXTXTX"] ? item["UDP Coex Performance"]["TXTXTX"]["BT Performance Result#1"] : ''), (item["UDP Coex Performance"]["TXTXTX"] ? item["UDP Coex Performance"]["TXTXTX"]["BT Performance Result#2"] : ''),
                            '', (item["UDP Coex Performance"]["TXTXRX"] ? item["UDP Coex Performance"]["TXTXRX"]["INTF1"] : ''), (item["UDP Coex Performance"]["TXTXRX"] ? item["UDP Coex Performance"]["TXTXRX"]["INTF2"] : ''), (item["UDP Coex Performance"]["TXTXRX"] ? item["UDP Coex Performance"]["TXTXRX"]["INTF2"] : ''), (item["UDP Coex Performance"]["TXTXRX"] ? item["UDP Coex Performance"]["TXTXRX"]["BT Performance Result#1"] : ''), (item["UDP Coex Performance"]["TXTXRX"] ? item["UDP Coex Performance"]["TXTXRX"]["BT Performance Result#2"] : ''),
                            '', (item["UDP Coex Performance"]["TXRXTX"] ? item["UDP Coex Performance"]["TXRXTX"]["INTF1"] : ''), (item["UDP Coex Performance"]["TXRXTX"] ? item["UDP Coex Performance"]["TXRXTX"]["INTF2"] : ''), (item["UDP Coex Performance"]["TXRXTX"] ? item["UDP Coex Performance"]["TXRXTX"]["INTF2"] : ''), (item["UDP Coex Performance"]["TXRXTX"] ? item["UDP Coex Performance"]["TXRXTX"]["BT Performance Result#1"] : ''), (item["UDP Coex Performance"]["TXRXTX"] ? item["UDP Coex Performance"]["TXRXTX"]["BT Performance Result#2"] : ''),
                            '', (item["UDP Coex Performance"]["TXRXRX"] ? item["UDP Coex Performance"]["TXRXRX"]["INTF1"] : ''), (item["UDP Coex Performance"]["TXRXRX"] ? item["UDP Coex Performance"]["TXRXRX"]["INTF2"] : ''), (item["UDP Coex Performance"]["TXRXRX"] ? item["UDP Coex Performance"]["TXRXRX"]["INTF2"] : ''), (item["UDP Coex Performance"]["TXRXRX"] ? item["UDP Coex Performance"]["TXRXRX"]["BT Performance Result#1"] : ''), (item["UDP Coex Performance"]["TXRXRX"] ? item["UDP Coex Performance"]["TXRXRX"]["BT Performance Result#2"] : ''),
                            '', (item["UDP Coex Performance"]["RXTXTX"] ? item["UDP Coex Performance"]["RXTXTX"]["INTF1"] : ''), (item["UDP Coex Performance"]["RXTXTX"] ? item["UDP Coex Performance"]["RXTXTX"]["INTF2"] : ''), (item["UDP Coex Performance"]["RXTXTX"] ? item["UDP Coex Performance"]["RXTXTX"]["INTF2"] : ''), (item["UDP Coex Performance"]["RXTXTX"] ? item["UDP Coex Performance"]["RXTXTX"]["BT Performance Result#1"] : ''), (item["UDP Coex Performance"]["RXTXTX"] ? item["UDP Coex Performance"]["RXTXTX"]["BT Performance Result#2"] : ''),
                            '', (item["UDP Coex Performance"]["RXTXRX"] ? item["UDP Coex Performance"]["RXTXRX"]["INTF1"] : ''), (item["UDP Coex Performance"]["RXTXRX"] ? item["UDP Coex Performance"]["RXTXRX"]["INTF2"] : ''), (item["UDP Coex Performance"]["RXTXRX"] ? item["UDP Coex Performance"]["RXTXRX"]["INTF2"] : ''), (item["UDP Coex Performance"]["RXTXRX"] ? item["UDP Coex Performance"]["RXTXRX"]["BT Performance Result#1"] : ''), (item["UDP Coex Performance"]["RXTXRX"] ? item["UDP Coex Performance"]["RXTXRX"]["BT Performance Result#2"] : ''),
                            '', (item["UDP Coex Performance"]["RXRXTX"] ? item["UDP Coex Performance"]["RXRXTX"]["INTF1"] : ''), (item["UDP Coex Performance"]["RXRXTX"] ? item["UDP Coex Performance"]["RXRXTX"]["INTF2"] : ''), (item["UDP Coex Performance"]["RXRXTX"] ? item["UDP Coex Performance"]["RXRXTX"]["INTF2"] : ''), (item["UDP Coex Performance"]["RXRXTX"] ? item["UDP Coex Performance"]["RXRXTX"]["BT Performance Result#1"] : ''), (item["UDP Coex Performance"]["RXRXTX"] ? item["UDP Coex Performance"]["RXRXTX"]["BT Performance Result#2"] : ''),
                            '', (item["UDP Coex Performance"]["RXRXRX"] ? item["UDP Coex Performance"]["RXRXRX"]["INTF1"] : ''), (item["UDP Coex Performance"]["RXRXRX"] ? item["UDP Coex Performance"]["RXRXRX"]["INTF2"] : ''), (item["UDP Coex Performance"]["RXRXRX"] ? item["UDP Coex Performance"]["RXRXRX"]["INTF2"] : ''), (item["UDP Coex Performance"]["RXRXRX"] ? item["UDP Coex Performance"]["RXRXRX"]["BT Performance Result#1"] : ''), (item["UDP Coex Performance"]["RXRXRX"] ? item["UDP Coex Performance"]["RXRXRX"]["BT Performance Result#2"] : ''));
                    }
                    newRow.push((item["RSSI"] ? item["RSSI"]["BT RSSI"] : ''), (item["RSSI"] ? item["RSSI"]["Wi-Fi Intf 1 RSSI"] : ''), (item["RSSI"] ? item["RSSI"]["Wi-Fi Intf 2 RSSI"] : ''), (item["RSSI"] ? item["RSSI"]["Wi-Fi Intf 3 RSSI"] : ''), '', item["Comments"]);

                    startRow = worksheet.getRow(row_num);
                    for (let index = 0; index < newRow.length; index++) {
                        startRow.getCell(index + 1).value = newRow[index];
                    }
                    row_num += 1;
                }
                await workbook.xlsx.writeFile(file); // xlsx format generated from the above template
                console.log("file - ", file);
            });
        console.log("file return- ", file);
        return file;
    } catch (err) {
        logger.error("generateCoexSimulTp3IntfReport : ", err);
    }
}

/*
    Creates a new xlsx excel workbook from the existing OTA RvR template for given RvR execution.
*/
async function generateOtaRvrReport(data, executionName) {

    try {
        let templateFile = config.public.path + config.public.templates + "OTA-RvR-12282020-RvR.xlsx";
        let file = config.public.path + config.public.output + executionName + '_OTA_RvR_Report.xlsx';

        await XlsxPopulate.fromFileAsync(templateFile)
            .then(workbook => {
                let worksheet = workbook.sheet("RvR"); // get particular sheet
                const usedRange = worksheet.usedRange();
                const values = usedRange.value();
                let row_num = 27;
                let startRow;
                // let attenVal = [];

                let attenColumnVal = values[0]; // table header to fetch attenuation values
                let attenColumns = _.filter(attenColumnVal, function(atten) {
                    if (atten.match('[0-9]+°')) {
                        return atten;
                    }
                });
                console.log("atten in header--", attenColumns);

                _.each(data, function(result) {
                    let attenuationVal = (Object.keys(result[0]));
                    let attenVal = [];
                    _.forEach(attenuationVal, function(val) {
                        if (val.match('^[0-9]*$')) {
                            attenVal.push(Number(val.match('^[0-9]*$')[0]));
                        }
                    });
                    console.log("atten in data--", attenVal);

                    _.each(result, function(item) {
                        /* Static column values for TP KPI data */
                        let newRow = [];
                        newRow.push(item["APUT"], item["AP-BE"], item["APUT Release Build"], item["Frequency Band"], item["Bandwidth"],
                            item["Channel"], item["Security"], item["APUT Mode"], item["APUT PT"], item["STAUT"],
                            item["STA-BE"], item["STAUT Release Build"], item["STAUT PT"], item["TP Protocol"], item["Attn"],
                            item["AVG TP"]);

                        _.each(attenColumns, function(element) {
                            console.log(element);
                            element = element.match('[0-9]+');
                            console.log(item[element]);
                            newRow.push(item[element] ? item[element] : '');
                        });

                        newRow.push(item["Comments"], item["AP-RSSI"], item["STA-RSSI"], item["Tester"]);

                        startRow = worksheet.row(row_num);
                        for (let index = 0; index < newRow.length; index++) {
                            startRow.cell(index + 1).value(newRow[index]);
                        }
                        row_num += 1;
                    });
                    row_num += 1;
                });
                return workbook.toFileAsync(file); // xlsx format generated from the above template
            })
        console.log("file return- ", file);
        return file;
    } catch (err) {
        logger.error("generateOtaRvrReport : ", err);
    }
}

/*
    Creates a new xlsx excel workbook from the existing Reverse OTA RvR template for given RvR execution.
*/
async function generateReverseOtaRvrReport(data, executionName) {

    try {
        let templateFile = config.public.path + config.public.templates + "OTA-RvR-12282020-Reverse_RvR.xlsx";
        let file = config.public.path + config.public.output + executionName + 'Reverse_OTA_RvR_Report.xlsx';

        await XlsxPopulate.fromFileAsync(templateFile)
            .then(workbook => {
                let worksheet = workbook.sheet("Reverse_RvR"); // get particular sheet
                const usedRange = worksheet.usedRange();
                const values = usedRange.value();
                let row_num = 27;
                let startRow;
                // let attenVal = [];

                let attenColumnVal = values[0]; // table header to fetch attenuation values
                let attenColumns = _.filter(attenColumnVal, function(atten) {
                    if (atten.match('[0-9]+°')) {
                        return atten;
                    }
                });
                console.log("atten in header--", attenColumns);

                _.each(data, function(result) {
                    let attenuationVal = (Object.keys(result[0]));
                    let attenVal = [];
                    _.forEach(attenuationVal, function(val) {
                        if (val.match('^[0-9]*$')) {
                            attenVal.push(Number(val.match('^[0-9]*$')[0]));
                        }
                    });
                    console.log("atten in data--", attenVal);

                    _.each(result, function(item) {
                        /* Static column values for TP KPI data */
                        let newRow = [];
                        newRow.push(item["AP"], item["SOC"], item["Release Build"], item["Band"],
                            item["Channel"], item["Security"], item["Configuration"], item["STA"], item["Traffic"],
                            item["Traffic Direction"], item["Attn"], item["RSSI"],
                            item["AVG"]);

                        _.each(attenColumns, function(element) {
                            console.log(element);
                            element = element.match('[0-9]+');
                            console.log(item[element]);

                            newRow.push(item[element] ? item[element] : '');
                        });

                        newRow.push(item["Comments"], item["Tester"]);

                        startRow = worksheet.row(row_num);
                        for (let index = 0; index < newRow.length; index++) {
                            startRow.cell(index + 1).value(newRow[index]);
                        }
                        row_num += 1;
                    });
                    row_num += 1;
                });
                return workbook.toFileAsync(file); // xlsx format generated from the above template
            })
        console.log("file return- ", file);
        return file;
    } catch (err) {
        logger.error("generateReverseOtaRvrReport : ", err);
    }
}

/*
    Creates a new xlsx excel workbook from the existing Unified All KPI template for given STA-Coex-Tp execution.
*/
async function generateStaCoexTpReport(data, executionName) {
    try {
        const workbook = new ExcelJS.Workbook(); // creates a new workbook
        let templateFile;
        let projectType = _.pluck(_.uniq(_.union(data), false, _.property('project_type')), 'project_type');

        if (projectType == 'STA-Coex-TP') {
            templateFile = config.public.path + config.public.templates + "STA_Coex_TP.xlsx";
        } else if (projectType == 'P2P-Coex-TP') {
            templateFile = config.public.path + config.public.templates + "P2P_Coex_TP.xlsx";
        } else if (projectType == 'MMH-Coex-TP') {
            templateFile = config.public.path + config.public.templates + "MMH_Coex_TP.xlsx";
        }
        let file = config.public.path + config.public.output + executionName + 'KPI_Report.xlsx';

        await workbook.xlsx.readFile(templateFile)
            .then(async function() {
                let worksheet;
                if (projectType == 'STA-Coex-TP') {
                    worksheet = workbook.getWorksheet("STA_Coex_TP"); // get particular sheet
                } else if (projectType == 'P2P-Coex-TP') {
                    worksheet = workbook.getWorksheet("P2P_Coex_TP"); // get particular sheet
                } else if (projectType == 'MMH-Coex-TP') {
                    worksheet = workbook.getWorksheet("MMH_Coex_TP"); // get particular sheet
                }
                let row_num = 14;
                let startRow = worksheet.getRow(row_num);

                for (let item of data) {
                    let newRow = ['', '', ''];
                    worksheet.getRow(14).getCell(1).value = executionName;

                    /* Static column values for STA-Coex-Tp KPI data */
                    newRow.push(item["TP TYPE"], item["DUT"], item["SoC Version"], item["SoC TYPE"], item["DUT Fw/Drv"], item["Interface"], item["Aggregation"], item["Spatial Streams"], item["Guard Interval"],
                        item["Data Rate"], item["Channel | 2 GHz"], item["Channel | 5 GHz"], item["SDIO Clock"], item["Companion Device/"], item["Companion Device FW/Drv"], item["Host Platform"], item["OS"], item["Security"], item["BT Ref"],
                        item["Coex mode"], item["ANT isolation"], item["BT profiles"], item["BT/BLE Role"], item["Profile Param"], item["Connection param"], item["BT Sniff"], item["Test Duration"], item["Test Repetition"]);

                    /* Band Mapped column values for STA-Coex-Tp KPI data */
                    newRow.push('', (item["BT Baseline"] ? item["BT Baseline"]["BT Baseline #1"] : ''), (item["BT Baseline"] ? item["BT Baseline"]["BT Baseline #2"] : ''), (item["BT Baseline"] ? item["BT Baseline"]["BT RSSI"] : ''));
                    if (typeof item["HT-20MHz | 2GHz"] != 'undefined') {
                        if ((typeof item["HT-20MHz | 2GHz"]["Wlan Baseline"] != 'undefined') && (typeof item["HT-20MHz | 2GHz"]["COEX_Performance"] != 'undefined')) {
                            newRow.push('', (item["HT-20MHz | 2GHz"]["Wlan Baseline"]["Baseline TCP-Tx"] ? item["HT-20MHz | 2GHz"]["Wlan Baseline"]["Baseline TCP-Tx"] : ''), (item["HT-20MHz | 2GHz"]["Wlan Baseline"]["Baseline TCP-Rx"] ? item["HT-20MHz | 2GHz"]["Wlan Baseline"]["Baseline TCP-Rx"] : ''), (item["HT-20MHz | 2GHz"]["Wlan Baseline"]["Baseline UDP-TX"] ? item["HT-20MHz | 2GHz"]["Wlan Baseline"]["Baseline UDP-TX"] : ''), (item["HT-20MHz | 2GHz"]["Wlan Baseline"]["Baseline UDP-Rx"] ? item["HT-20MHz | 2GHz"]["Wlan Baseline"]["Baseline UDP-Rx"] : ''), (item["HT-20MHz | 2GHz"]["Wlan Baseline"]["Wi-Fi RSSI"] ? item["HT-20MHz | 2GHz"]["Wlan Baseline"]["Wi-Fi RSSI"] : ''),
                                (item["HT-20MHz | 2GHz"]["COEX_Performance"]["Coex TCP-TX"] ? item["HT-20MHz | 2GHz"]["COEX_Performance"]["Coex TCP-TX"] : ''), (item["HT-20MHz | 2GHz"]["COEX_Performance"]["CoexTCP-TX_BT Performance Result#1"] ? item["HT-20MHz | 2GHz"]["COEX_Performance"]["CoexTCP-TX_BT Performance Result#1"] : ''), (item["HT-20MHz | 2GHz"]["COEX_Performance"]["CoexTCP-TX_BT Performance Result#2"] ? item["HT-20MHz | 2GHz"]["COEX_Performance"]["CoexTCP-TX_BT Performance Result#2"] : ''), (item["HT-20MHz | 2GHz"]["COEX_Performance"]["Coex TCP-RX"] ? item["HT-20MHz | 2GHz"]["COEX_Performance"]["Coex TCP-RX"] : ''),
                                (item["HT-20MHz | 2GHz"]["COEX_Performance"]["CoexTCP-RX_BT Performance Result#1"] ? item["HT-20MHz | 2GHz"]["COEX_Performance"]["CoexTCP-RX_BT Performance Result#1"] : ''), (item["HT-20MHz | 2GHz"]["COEX_Performance"]["CoexTCP-RX_BT Performance Result#2"] ? item["HT-20MHz | 2GHz"]["COEX_Performance"]["CoexTCP-RX_BT Performance Result#2"] : ''), (item["HT-20MHz | 2GHz"]["COEX_Performance"]["Coex UDP-TX"] ? item["HT-20MHz | 2GHz"]["COEX_Performance"]["Coex UDP-TX"] : ''), (item["HT-20MHz | 2GHz"]["COEX_Performance"]["CoexUDP-TX_BT Performance Result#1"] ? item["HT-20MHz | 2GHz"]["COEX_Performance"]["CoexUDP-TX_BT Performance Result#1"] : ''),
                                (item["HT-20MHz | 2GHz"]["COEX_Performance"]["CoexUDP-TX_BT Performance Result#2"] ? item["HT-20MHz | 2GHz"]["COEX_Performance"]["CoexUDP-TX_BT Performance Result#2"] : ''), (item["HT-20MHz | 2GHz"]["COEX_Performance"]["Coex UDP-RX"] ? item["HT-20MHz | 2GHz"]["COEX_Performance"]["Coex UDP-RX"] : ''), (item["HT-20MHz | 2GHz"]["COEX_Performance"]["CoexUDP-RX_BT Performance Result#1"] ? item["HT-20MHz | 2GHz"]["COEX_Performance"]["CoexUDP-RX_BT Performance Result#1"] : ''), (item["HT-20MHz | 2GHz"]["COEX_Performance"]["CoexUDP-RX_BT Performance Result#2"] ? item["HT-20MHz | 2GHz"]["COEX_Performance"]["CoexUDP-RX_BT Performance Result#2"] : ''),
                                (item["HT-20MHz | 2GHz"]["COEX_Performance"]["BT RSSI"] ? item["HT-20MHz | 2GHz"]["COEX_Performance"]["BT RSSI"] : ''), (item["HT-20MHz | 2GHz"]["COEX_Performance"]["Wi-Fi RSSI"] ? item["HT-20MHz | 2GHz"]["COEX_Performance"]["Wi-Fi RSSI"] : ''));
                        } else if (typeof item["HT-20MHz | 2GHz"]["Wlan Baseline"] != 'undefined') {
                            newRow.push('', (item["HT-20MHz | 2GHz"]["Wlan Baseline"]["Baseline TCP-Tx"] ? item["HT-20MHz | 2GHz"]["Wlan Baseline"]["Baseline TCP-Tx"] : ''), (item["HT-20MHz | 2GHz"]["Wlan Baseline"]["Baseline TCP-Rx"] ? item["HT-20MHz | 2GHz"]["Wlan Baseline"]["Baseline TCP-Rx"] : ''), (item["HT-20MHz | 2GHz"]["Wlan Baseline"]["Baseline UDP-TX"] ? item["HT-20MHz | 2GHz"]["Wlan Baseline"]["Baseline UDP-TX"] : ''), (item["HT-20MHz | 2GHz"]["Wlan Baseline"]["Baseline UDP-Rx"] ? item["HT-20MHz | 2GHz"]["Wlan Baseline"]["Baseline UDP-Rx"] : ''), (item["HT-20MHz | 2GHz"]["Wlan Baseline"]["Wi-Fi RSSI"] ? item["HT-20MHz | 2GHz"]["Wlan Baseline"]["Wi-Fi RSSI"] : ''),
                                '', '', '', '', '', '', '', '', '', '', '', '', '', '');
                        } else {
                            newRow.push('', '', '', '', '', '', (item["HT-20MHz | 2GHz"]["COEX_Performance"]["Coex TCP-TX"] ? item["HT-20MHz | 2GHz"]["COEX_Performance"]["Coex TCP-TX"] : ''), (item["HT-20MHz | 2GHz"]["COEX_Performance"]["CoexTCP-TX_BT Performance Result#1"] ? item["HT-20MHz | 2GHz"]["COEX_Performance"]["CoexTCP-TX_BT Performance Result#1"] : ''), (item["HT-20MHz | 2GHz"]["COEX_Performance"]["CoexTCP-TX_BT Performance Result#2"] ? item["HT-20MHz | 2GHz"]["COEX_Performance"]["CoexTCP-TX_BT Performance Result#2"] : ''), (item["HT-20MHz | 2GHz"]["COEX_Performance"]["Coex TCP-RX"] ? item["HT-20MHz | 2GHz"]["COEX_Performance"]["Coex TCP-RX"] : ''),
                                (item["HT-20MHz | 2GHz"]["COEX_Performance"]["CoexTCP-RX_BT Performance Result#1"] ? item["HT-20MHz | 2GHz"]["COEX_Performance"]["CoexTCP-RX_BT Performance Result#1"] : ''), (item["HT-20MHz | 2GHz"]["COEX_Performance"]["CoexTCP-RX_BT Performance Result#2"] ? item["HT-20MHz | 2GHz"]["COEX_Performance"]["CoexTCP-RX_BT Performance Result#2"] : ''), (item["HT-20MHz | 2GHz"]["COEX_Performance"]["Coex UDP-TX"] ? item["HT-20MHz | 2GHz"]["COEX_Performance"]["Coex UDP-TX"] : ''), (item["HT-20MHz | 2GHz"]["COEX_Performance"]["CoexUDP-TX_BT Performance Result#1"] ? item["HT-20MHz | 2GHz"]["COEX_Performance"]["CoexUDP-TX_BT Performance Result#1"] : ''),
                                (item["HT-20MHz | 2GHz"]["COEX_Performance"]["CoexUDP-TX_BT Performance Result#2"] ? item["HT-20MHz | 2GHz"]["COEX_Performance"]["CoexUDP-TX_BT Performance Result#2"] : ''), (item["HT-20MHz | 2GHz"]["COEX_Performance"]["Coex UDP-RX"] ? item["HT-20MHz | 2GHz"]["COEX_Performance"]["Coex UDP-RX"] : ''), (item["HT-20MHz | 2GHz"]["COEX_Performance"]["CoexUDP-RX_BT Performance Result#1"] ? item["HT-20MHz | 2GHz"]["COEX_Performance"]["CoexUDP-RX_BT Performance Result#1"] : ''), (item["HT-20MHz | 2GHz"]["COEX_Performance"]["CoexUDP-RX_BT Performance Result#2"] ? item["HT-20MHz | 2GHz"]["COEX_Performance"]["CoexUDP-RX_BT Performance Result#2"] : ''),
                                (item["HT-20MHz | 2GHz"]["COEX_Performance"]["BT RSSI"] ? item["HT-20MHz | 2GHz"]["COEX_Performance"]["BT RSSI"] : ''), (item["HT-20MHz | 2GHz"]["COEX_Performance"]["Wi-Fi RSSI"] ? item["HT-20MHz | 2GHz"]["COEX_Performance"]["Wi-Fi RSSI"] : ''));
                        }
                    } else {
                        newRow.push('', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '');
                    }
                    if (typeof item["HE-20MHz | 2GHz"] != 'undefined') {
                        if ((typeof item["HE-20MHz | 2GHz"]["Wlan Baseline"] != 'undefined') && (typeof item["HE-20MHz | 2GHz"]["COEX_Performance"] != 'undefined')) {
                            newRow.push('', (item["HE-20MHz | 2GHz"]["Wlan Baseline"]["Baseline TCP-Tx"] ? item["HE-20MHz | 2GHz"]["Wlan Baseline"]["Baseline TCP-Tx"] : ''), (item["HE-20MHz | 2GHz"]["Wlan Baseline"]["Baseline TCP-Rx"] ? item["HE-20MHz | 2GHz"]["Wlan Baseline"]["Baseline TCP-Rx"] : ''), (item["HE-20MHz | 2GHz"]["Wlan Baseline"]["Baseline UDP-TX"] ? item["HE-20MHz | 2GHz"]["Wlan Baseline"]["Baseline UDP-TX"] : ''), (item["HE-20MHz | 2GHz"]["Wlan Baseline"]["Baseline UDP-Rx"] ? item["HE-20MHz | 2GHz"]["Wlan Baseline"]["Baseline UDP-Rx"] : ''), (item["HE-20MHz | 2GHz"]["Wlan Baseline"]["Wi-Fi RSSI"] ? item["HE-20MHz | 2GHz"]["Wlan Baseline"]["Wi-Fi RSSI"] : ''),
                                (item["HE-20MHz | 2GHz"]["COEX_Performance"]["Coex TCP-TX"] ? item["HE-20MHz | 2GHz"]["COEX_Performance"]["Coex TCP-TX"] : ''), (item["HE-20MHz | 2GHz"]["COEX_Performance"]["CoexTCP-TX_BT Performance Result#1"] ? item["HE-20MHz | 2GHz"]["COEX_Performance"]["CoexTCP-TX_BT Performance Result#1"] : ''), (item["HE-20MHz | 2GHz"]["COEX_Performance"]["CoexTCP-TX_BT Performance Result#2"] ? item["HE-20MHz | 2GHz"]["COEX_Performance"]["CoexTCP-TX_BT Performance Result#2"] : ''), (item["HE-20MHz | 2GHz"]["COEX_Performance"]["Coex TCP-RX"] ? item["HE-20MHz | 2GHz"]["COEX_Performance"]["Coex TCP-RX"] : ''),
                                (item["HE-20MHz | 2GHz"]["COEX_Performance"]["CoexTCP-RX_BT Performance Result#1"] ? item["HE-20MHz | 2GHz"]["COEX_Performance"]["CoexTCP-RX_BT Performance Result#1"] : ''), (item["HE-20MHz | 2GHz"]["COEX_Performance"]["CoexTCP-RX_BT Performance Result#2"] ? item["HE-20MHz | 2GHz"]["COEX_Performance"]["CoexTCP-RX_BT Performance Result#2"] : ''), (item["HE-20MHz | 2GHz"]["COEX_Performance"]["Coex UDP-TX"] ? item["HE-20MHz | 2GHz"]["COEX_Performance"]["Coex UDP-TX"] : ''), (item["HE-20MHz | 2GHz"]["COEX_Performance"]["CoexUDP-TX_BT Performance Result#1"] ? item["HE-20MHz | 2GHz"]["COEX_Performance"]["CoexUDP-TX_BT Performance Result#1"] : ''),
                                (item["HE-20MHz | 2GHz"]["COEX_Performance"]["CoexUDP-TX_BT Performance Result#2"] ? item["HE-20MHz | 2GHz"]["COEX_Performance"]["CoexUDP-TX_BT Performance Result#2"] : ''), (item["HE-20MHz | 2GHz"]["COEX_Performance"]["Coex UDP-RX"] ? item["HE-20MHz | 2GHz"]["COEX_Performance"]["Coex UDP-RX"] : ''), (item["HE-20MHz | 2GHz"]["COEX_Performance"]["CoexUDP-RX_BT Performance Result#1"] ? item["HE-20MHz | 2GHz"]["COEX_Performance"]["CoexUDP-RX_BT Performance Result#1"] : ''), (item["HE-20MHz | 2GHz"]["COEX_Performance"]["CoexUDP-RX_BT Performance Result#2"] ? item["HE-20MHz | 2GHz"]["COEX_Performance"]["CoexUDP-RX_BT Performance Result#2"] : ''),
                                (item["HE-20MHz | 2GHz"]["COEX_Performance"]["BT RSSI"] ? item["HE-20MHz | 2GHz"]["COEX_Performance"]["BT RSSI"] : ''), (item["HE-20MHz | 2GHz"]["COEX_Performance"]["Wi-Fi RSSI"] ? item["HE-20MHz | 2GHz"]["COEX_Performance"]["Wi-Fi RSSI"] : ''));
                        } else if (typeof item["HE-20MHz | 2GHz"]["Wlan Baseline"] != 'undefined') {
                            newRow.push('', (item["HE-20MHz | 2GHz"]["Wlan Baseline"]["Baseline TCP-Tx"] ? item["HE-20MHz | 2GHz"]["Wlan Baseline"]["Baseline TCP-Tx"] : ''), (item["HE-20MHz | 2GHz"]["Wlan Baseline"]["Baseline TCP-Rx"] ? item["HE-20MHz | 2GHz"]["Wlan Baseline"]["Baseline TCP-Rx"] : ''), (item["HE-20MHz | 2GHz"]["Wlan Baseline"]["Baseline UDP-TX"] ? item["HE-20MHz | 2GHz"]["Wlan Baseline"]["Baseline UDP-TX"] : ''), (item["HE-20MHz | 2GHz"]["Wlan Baseline"]["Baseline UDP-Rx"] ? item["HE-20MHz | 2GHz"]["Wlan Baseline"]["Baseline UDP-Rx"] : ''), (item["HE-20MHz | 2GHz"]["Wlan Baseline"]["Wi-Fi RSSI"] ? item["HE-20MHz | 2GHz"]["Wlan Baseline"]["Wi-Fi RSSI"] : ''),
                                '', '', '', '', '', '', '', '', '', '', '', '', '', '');
                        } else {
                            newRow.push('', '', '', '', '', '', (item["HE-20MHz | 2GHz"]["COEX_Performance"]["Coex TCP-TX"] ? item["HE-20MHz | 2GHz"]["COEX_Performance"]["Coex TCP-TX"] : ''), (item["HE-20MHz | 2GHz"]["COEX_Performance"]["CoexTCP-TX_BT Performance Result#1"] ? item["HE-20MHz | 2GHz"]["COEX_Performance"]["CoexTCP-TX_BT Performance Result#1"] : ''), (item["HE-20MHz | 2GHz"]["COEX_Performance"]["CoexTCP-TX_BT Performance Result#2"] ? item["HE-20MHz | 2GHz"]["COEX_Performance"]["CoexTCP-TX_BT Performance Result#2"] : ''), (item["HE-20MHz | 2GHz"]["COEX_Performance"]["Coex TCP-RX"] ? item["HE-20MHz | 2GHz"]["COEX_Performance"]["Coex TCP-RX"] : ''),
                                (item["HE-20MHz | 2GHz"]["COEX_Performance"]["CoexTCP-RX_BT Performance Result#1"] ? item["HE-20MHz | 2GHz"]["COEX_Performance"]["CoexTCP-RX_BT Performance Result#1"] : ''), (item["HE-20MHz | 2GHz"]["COEX_Performance"]["CoexTCP-RX_BT Performance Result#2"] ? item["HE-20MHz | 2GHz"]["COEX_Performance"]["CoexTCP-RX_BT Performance Result#2"] : ''), (item["HE-20MHz | 2GHz"]["COEX_Performance"]["Coex UDP-TX"] ? item["HE-20MHz | 2GHz"]["COEX_Performance"]["Coex UDP-TX"] : ''), (item["HE-20MHz | 2GHz"]["COEX_Performance"]["CoexUDP-TX_BT Performance Result#1"] ? item["HE-20MHz | 2GHz"]["COEX_Performance"]["CoexUDP-TX_BT Performance Result#1"] : ''),
                                (item["HE-20MHz | 2GHz"]["COEX_Performance"]["CoexUDP-TX_BT Performance Result#2"] ? item["HE-20MHz | 2GHz"]["COEX_Performance"]["CoexUDP-TX_BT Performance Result#2"] : ''), (item["HE-20MHz | 2GHz"]["COEX_Performance"]["Coex UDP-RX"] ? item["HE-20MHz | 2GHz"]["COEX_Performance"]["Coex UDP-RX"] : ''), (item["HE-20MHz | 2GHz"]["COEX_Performance"]["CoexUDP-RX_BT Performance Result#1"] ? item["HE-20MHz | 2GHz"]["COEX_Performance"]["CoexUDP-RX_BT Performance Result#1"] : ''), (item["HE-20MHz | 2GHz"]["COEX_Performance"]["CoexUDP-RX_BT Performance Result#2"] ? item["HE-20MHz | 2GHz"]["COEX_Performance"]["CoexUDP-RX_BT Performance Result#2"] : ''),
                                (item["HE-20MHz | 2GHz"]["COEX_Performance"]["BT RSSI"] ? item["HE-20MHz | 2GHz"]["COEX_Performance"]["BT RSSI"] : ''), (item["HE-20MHz | 2GHz"]["COEX_Performance"]["Wi-Fi RSSI"] ? item["HE-20MHz | 2GHz"]["COEX_Performance"]["Wi-Fi RSSI"] : ''));
                        }
                    } else {
                        newRow.push('', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '');
                    }
                    if (typeof item["VHT-80MHz | 5GHz"] != 'undefined') {
                        if ((typeof item["VHT-80MHz | 5GHz"]["Wlan Baseline"] != 'undefined') && (typeof item["VHT-80MHz | 5GHz"]["COEX_Performance"] != 'undefined')) {
                            newRow.push('', (item["VHT-80MHz | 5GHz"]["Wlan Baseline"]["Baseline TCP-Tx"] ? item["VHT-80MHz | 5GHz"]["Wlan Baseline"]["Baseline TCP-Tx"] : ''), (item["VHT-80MHz | 5GHz"]["Wlan Baseline"]["Baseline TCP-Rx"] ? item["VHT-80MHz | 5GHz"]["Wlan Baseline"]["Baseline TCP-Rx"] : ''), (item["VHT-80MHz | 5GHz"]["Wlan Baseline"]["Baseline UDP-TX"] ? item["VHT-80MHz | 5GHz"]["Wlan Baseline"]["Baseline UDP-TX"] : ''), (item["VHT-80MHz | 5GHz"]["Wlan Baseline"]["Baseline UDP-Rx"] ? item["VHT-80MHz | 5GHz"]["Wlan Baseline"]["Baseline UDP-Rx"] : ''), (item["VHT-80MHz | 5GHz"]["Wlan Baseline"]["Wi-Fi RSSI"] ? item["VHT-80MHz | 5GHz"]["Wlan Baseline"]["Wi-Fi RSSI"] : ''),
                                (item["VHT-80MHz | 5GHz"]["COEX_Performance"]["Coex TCP-TX"] ? item["VHT-80MHz | 5GHz"]["COEX_Performance"]["Coex TCP-TX"] : ''), (item["VHT-80MHz | 5GHz"]["COEX_Performance"]["CoexTCP-TX_BT Performance Result#1"] ? item["VHT-80MHz | 5GHz"]["COEX_Performance"]["CoexTCP-TX_BT Performance Result#1"] : ''), (item["VHT-80MHz | 5GHz"]["COEX_Performance"]["CoexTCP-TX_BT Performance Result#2"] ? item["VHT-80MHz | 5GHz"]["COEX_Performance"]["CoexTCP-TX_BT Performance Result#2"] : ''), (item["VHT-80MHz | 5GHz"]["COEX_Performance"]["Coex TCP-RX"] ? item["VHT-80MHz | 5GHz"]["COEX_Performance"]["Coex TCP-RX"] : ''),
                                (item["VHT-80MHz | 5GHz"]["COEX_Performance"]["CoexTCP-RX_BT Performance Result#1"] ? item["VHT-80MHz | 5GHz"]["COEX_Performance"]["CoexTCP-RX_BT Performance Result#1"] : ''), (item["VHT-80MHz | 5GHz"]["COEX_Performance"]["CoexTCP-RX_BT Performance Result#2"] ? item["VHT-80MHz | 5GHz"]["COEX_Performance"]["CoexTCP-RX_BT Performance Result#2"] : ''), (item["VHT-80MHz | 5GHz"]["COEX_Performance"]["Coex UDP-TX"] ? item["VHT-80MHz | 5GHz"]["COEX_Performance"]["Coex UDP-TX"] : ''), (item["VHT-80MHz | 5GHz"]["COEX_Performance"]["CoexUDP-TX_BT Performance Result#1"] ? item["VHT-80MHz | 5GHz"]["COEX_Performance"]["CoexUDP-TX_BT Performance Result#1"] : ''),
                                (item["VHT-80MHz | 5GHz"]["COEX_Performance"]["CoexUDP-TX_BT Performance Result#2"] ? item["VHT-80MHz | 5GHz"]["COEX_Performance"]["CoexUDP-TX_BT Performance Result#2"] : ''), (item["VHT-80MHz | 5GHz"]["COEX_Performance"]["Coex UDP-RX"] ? item["VHT-80MHz | 5GHz"]["COEX_Performance"]["Coex UDP-RX"] : ''), (item["VHT-80MHz | 5GHz"]["COEX_Performance"]["CoexUDP-RX_BT Performance Result#1"] ? item["VHT-80MHz | 5GHz"]["COEX_Performance"]["CoexUDP-RX_BT Performance Result#1"] : ''), (item["VHT-80MHz | 5GHz"]["COEX_Performance"]["CoexUDP-RX_BT Performance Result#2"] ? item["VHT-80MHz | 5GHz"]["COEX_Performance"]["CoexUDP-RX_BT Performance Result#2"] : ''),
                                (item["VHT-80MHz | 5GHz"]["COEX_Performance"]["BT RSSI"] ? item["VHT-80MHz | 5GHz"]["COEX_Performance"]["BT RSSI"] : ''), (item["VHT-80MHz | 5GHz"]["COEX_Performance"]["Wi-Fi RSSI"] ? item["VHT-80MHz | 5GHz"]["COEX_Performance"]["Wi-Fi RSSI"] : ''));
                        } else if (typeof item["VHT-80MHz | 5GHz"]["Wlan Baseline"] != 'undefined') {
                            newRow.push('', (item["VHT-80MHz | 5GHz"]["Wlan Baseline"]["Baseline TCP-Tx"] ? item["VHT-80MHz | 5GHz"]["Wlan Baseline"]["Baseline TCP-Tx"] : ''), (item["VHT-80MHz | 5GHz"]["Wlan Baseline"]["Baseline TCP-Rx"] ? item["VHT-80MHz | 5GHz"]["Wlan Baseline"]["Baseline TCP-Rx"] : ''), (item["VHT-80MHz | 5GHz"]["Wlan Baseline"]["Baseline UDP-TX"] ? item["VHT-80MHz | 5GHz"]["Wlan Baseline"]["Baseline UDP-TX"] : ''), (item["VHT-80MHz | 5GHz"]["Wlan Baseline"]["Baseline UDP-Rx"] ? item["VHT-80MHz | 5GHz"]["Wlan Baseline"]["Baseline UDP-Rx"] : ''), (item["VHT-80MHz | 5GHz"]["Wlan Baseline"]["Wi-Fi RSSI"] ? item["VHT-80MHz | 5GHz"]["Wlan Baseline"]["Wi-Fi RSSI"] : ''),
                                '', '', '', '', '', '', '', '', '', '', '', '', '', '');
                        } else {
                            newRow.push('', '', '', '', '', '', (item["VHT-80MHz | 5GHz"]["COEX_Performance"]["Coex TCP-TX"] ? item["VHT-80MHz | 5GHz"]["COEX_Performance"]["Coex TCP-TX"] : ''), (item["VHT-80MHz | 5GHz"]["COEX_Performance"]["CoexTCP-TX_BT Performance Result#1"] ? item["VHT-80MHz | 5GHz"]["COEX_Performance"]["CoexTCP-TX_BT Performance Result#1"] : ''), (item["VHT-80MHz | 5GHz"]["COEX_Performance"]["CoexTCP-TX_BT Performance Result#2"] ? item["VHT-80MHz | 5GHz"]["COEX_Performance"]["CoexTCP-TX_BT Performance Result#2"] : ''), (item["VHT-80MHz | 5GHz"]["COEX_Performance"]["Coex TCP-RX"] ? item["VHT-80MHz | 5GHz"]["COEX_Performance"]["Coex TCP-RX"] : ''),
                                (item["VHT-80MHz | 5GHz"]["COEX_Performance"]["CoexTCP-RX_BT Performance Result#1"] ? item["VHT-80MHz | 5GHz"]["COEX_Performance"]["CoexTCP-RX_BT Performance Result#1"] : ''), (item["VHT-80MHz | 5GHz"]["COEX_Performance"]["CoexTCP-RX_BT Performance Result#2"] ? item["VHT-80MHz | 5GHz"]["COEX_Performance"]["CoexTCP-RX_BT Performance Result#2"] : ''), (item["VHT-80MHz | 5GHz"]["COEX_Performance"]["Coex UDP-TX"] ? item["VHT-80MHz | 5GHz"]["COEX_Performance"]["Coex UDP-TX"] : ''), (item["VHT-80MHz | 5GHz"]["COEX_Performance"]["CoexUDP-TX_BT Performance Result#1"] ? item["VHT-80MHz | 5GHz"]["COEX_Performance"]["CoexUDP-TX_BT Performance Result#1"] : ''),
                                (item["VHT-80MHz | 5GHz"]["COEX_Performance"]["CoexUDP-TX_BT Performance Result#2"] ? item["VHT-80MHz | 5GHz"]["COEX_Performance"]["CoexUDP-TX_BT Performance Result#2"] : ''), (item["VHT-80MHz | 5GHz"]["COEX_Performance"]["Coex UDP-RX"] ? item["VHT-80MHz | 5GHz"]["COEX_Performance"]["Coex UDP-RX"] : ''), (item["VHT-80MHz | 5GHz"]["COEX_Performance"]["CoexUDP-RX_BT Performance Result#1"] ? item["VHT-80MHz | 5GHz"]["COEX_Performance"]["CoexUDP-RX_BT Performance Result#1"] : ''), (item["VHT-80MHz | 5GHz"]["COEX_Performance"]["CoexUDP-RX_BT Performance Result#2"] ? item["VHT-80MHz | 5GHz"]["COEX_Performance"]["CoexUDP-RX_BT Performance Result#2"] : ''),
                                (item["VHT-80MHz | 5GHz"]["COEX_Performance"]["BT RSSI"] ? item["VHT-80MHz | 5GHz"]["COEX_Performance"]["BT RSSI"] : ''), (item["VHT-80MHz | 5GHz"]["COEX_Performance"]["Wi-Fi RSSI"] ? item["VHT-80MHz | 5GHz"]["COEX_Performance"]["Wi-Fi RSSI"] : ''));
                        }
                    } else {
                        newRow.push('', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '');
                    }
                    if (typeof item["HE-80MHz | 5GHz"] != 'undefined') {
                        if ((typeof item["HE-80MHz | 5GHz"]["Wlan Baseline"] != 'undefined') && (typeof item["HE-80MHz | 5GHz"]["COEX_Performance"] != 'undefined')) {
                            newRow.push('', (item["HE-80MHz | 5GHz"]["Wlan Baseline"]["Baseline TCP-Tx"] ? item["HE-80MHz | 5GHz"]["Wlan Baseline"]["Baseline TCP-Tx"] : ''), (item["HE-80MHz | 5GHz"]["Wlan Baseline"]["Baseline TCP-Rx"] ? item["HE-80MHz | 5GHz"]["Wlan Baseline"]["Baseline TCP-Rx"] : ''), (item["HE-80MHz | 5GHz"]["Wlan Baseline"]["Baseline UDP-TX"] ? item["HE-80MHz | 5GHz"]["Wlan Baseline"]["Baseline UDP-TX"] : ''), (item["HE-80MHz | 5GHz"]["Wlan Baseline"]["Baseline UDP-Rx"] ? item["HE-80MHz | 5GHz"]["Wlan Baseline"]["Baseline UDP-Rx"] : ''), (item["HE-80MHz | 5GHz"]["Wlan Baseline"]["Wi-Fi RSSI"] ? item["HE-80MHz | 5GHz"]["Wlan Baseline"]["Wi-Fi RSSI"] : ''),
                                (item["HE-80MHz | 5GHz"]["COEX_Performance"]["Coex TCP-TX"] ? item["HE-80MHz | 5GHz"]["COEX_Performance"]["Coex TCP-TX"] : ''), (item["HE-80MHz | 5GHz"]["COEX_Performance"]["CoexTCP-TX_BT Performance Result#1"] ? item["HE-80MHz | 5GHz"]["COEX_Performance"]["CoexTCP-TX_BT Performance Result#1"] : ''), (item["HE-80MHz | 5GHz"]["COEX_Performance"]["CoexTCP-TX_BT Performance Result#2"] ? item["HE-80MHz | 5GHz"]["COEX_Performance"]["CoexTCP-TX_BT Performance Result#2"] : ''), (item["HE-80MHz | 5GHz"]["COEX_Performance"]["Coex TCP-RX"] ? item["HE-80MHz | 5GHz"]["COEX_Performance"]["Coex TCP-RX"] : ''),
                                (item["HE-80MHz | 5GHz"]["COEX_Performance"]["CoexTCP-RX_BT Performance Result#1"] ? item["HE-80MHz | 5GHz"]["COEX_Performance"]["CoexTCP-RX_BT Performance Result#1"] : ''), (item["HE-80MHz | 5GHz"]["COEX_Performance"]["CoexTCP-RX_BT Performance Result#2"] ? item["HE-80MHz | 5GHz"]["COEX_Performance"]["CoexTCP-RX_BT Performance Result#2"] : ''), (item["HE-80MHz | 5GHz"]["COEX_Performance"]["Coex UDP-TX"] ? item["HE-80MHz | 5GHz"]["COEX_Performance"]["Coex UDP-TX"] : ''), (item["HE-80MHz | 5GHz"]["COEX_Performance"]["CoexUDP-TX_BT Performance Result#1"] ? item["HE-80MHz | 5GHz"]["COEX_Performance"]["CoexUDP-TX_BT Performance Result#1"] : ''),
                                (item["HE-80MHz | 5GHz"]["COEX_Performance"]["CoexUDP-TX_BT Performance Result#2"] ? item["HE-80MHz | 5GHz"]["COEX_Performance"]["CoexUDP-TX_BT Performance Result#2"] : ''), (item["HE-80MHz | 5GHz"]["COEX_Performance"]["Coex UDP-RX"] ? item["HE-80MHz | 5GHz"]["COEX_Performance"]["Coex UDP-RX"] : ''), (item["HE-80MHz | 5GHz"]["COEX_Performance"]["CoexUDP-RX_BT Performance Result#1"] ? item["HE-80MHz | 5GHz"]["COEX_Performance"]["CoexUDP-RX_BT Performance Result#1"] : ''), (item["HE-80MHz | 5GHz"]["COEX_Performance"]["CoexUDP-RX_BT Performance Result#2"] ? item["HE-80MHz | 5GHz"]["COEX_Performance"]["CoexUDP-RX_BT Performance Result#2"] : ''),
                                (item["HE-80MHz | 5GHz"]["COEX_Performance"]["BT RSSI"] ? item["HE-80MHz | 5GHz"]["COEX_Performance"]["BT RSSI"] : ''), (item["HE-80MHz | 5GHz"]["COEX_Performance"]["Wi-Fi RSSI"] ? item["HE-80MHz | 5GHz"]["COEX_Performance"]["Wi-Fi RSSI"] : ''));
                        } else if (typeof item["HE-80MHz | 5GHz"]["Wlan Baseline"] != 'undefined') {
                            newRow.push('', (item["HE-80MHz | 5GHz"]["Wlan Baseline"]["Baseline TCP-Tx"] ? item["HE-80MHz | 5GHz"]["Wlan Baseline"]["Baseline TCP-Tx"] : ''), (item["HE-80MHz | 5GHz"]["Wlan Baseline"]["Baseline TCP-Rx"] ? item["HE-80MHz | 5GHz"]["Wlan Baseline"]["Baseline TCP-Rx"] : ''), (item["HE-80MHz | 5GHz"]["Wlan Baseline"]["Baseline UDP-TX"] ? item["HE-80MHz | 5GHz"]["Wlan Baseline"]["Baseline UDP-TX"] : ''), (item["HE-80MHz | 5GHz"]["Wlan Baseline"]["Baseline UDP-Rx"] ? item["HE-80MHz | 5GHz"]["Wlan Baseline"]["Baseline UDP-Rx"] : ''), (item["HE-80MHz | 5GHz"]["Wlan Baseline"]["Wi-Fi RSSI"] ? item["HE-80MHz | 5GHz"]["Wlan Baseline"]["Wi-Fi RSSI"] : ''),
                                '', '', '', '', '', '', '', '', '', '', '', '', '', '');
                        } else {
                            newRow.push('', '', '', '', '', '', (item["HE-80MHz | 5GHz"]["COEX_Performance"]["Coex TCP-TX"] ? item["HE-80MHz | 5GHz"]["COEX_Performance"]["Coex TCP-TX"] : ''), (item["HE-80MHz | 5GHz"]["COEX_Performance"]["CoexTCP-TX_BT Performance Result#1"] ? item["HE-80MHz | 5GHz"]["COEX_Performance"]["CoexTCP-TX_BT Performance Result#1"] : ''), (item["HE-80MHz | 5GHz"]["COEX_Performance"]["CoexTCP-TX_BT Performance Result#2"] ? item["HE-80MHz | 5GHz"]["COEX_Performance"]["CoexTCP-TX_BT Performance Result#2"] : ''), (item["HE-80MHz | 5GHz"]["COEX_Performance"]["Coex TCP-RX"] ? item["HE-80MHz | 5GHz"]["COEX_Performance"]["Coex TCP-RX"] : ''),
                                (item["HE-80MHz | 5GHz"]["COEX_Performance"]["CoexTCP-RX_BT Performance Result#1"] ? item["HE-80MHz | 5GHz"]["COEX_Performance"]["CoexTCP-RX_BT Performance Result#1"] : ''), (item["HE-80MHz | 5GHz"]["COEX_Performance"]["CoexTCP-RX_BT Performance Result#2"] ? item["HE-80MHz | 5GHz"]["COEX_Performance"]["CoexTCP-RX_BT Performance Result#2"] : ''), (item["HE-80MHz | 5GHz"]["COEX_Performance"]["Coex UDP-TX"] ? item["HE-80MHz | 5GHz"]["COEX_Performance"]["Coex UDP-TX"] : ''), (item["HE-80MHz | 5GHz"]["COEX_Performance"]["CoexUDP-TX_BT Performance Result#1"] ? item["HE-80MHz | 5GHz"]["COEX_Performance"]["CoexUDP-TX_BT Performance Result#1"] : ''),
                                (item["HE-80MHz | 5GHz"]["COEX_Performance"]["CoexUDP-TX_BT Performance Result#2"] ? item["HE-80MHz | 5GHz"]["COEX_Performance"]["CoexUDP-TX_BT Performance Result#2"] : ''), (item["HE-80MHz | 5GHz"]["COEX_Performance"]["Coex UDP-RX"] ? item["HE-80MHz | 5GHz"]["COEX_Performance"]["Coex UDP-RX"] : ''), (item["HE-80MHz | 5GHz"]["COEX_Performance"]["CoexUDP-RX_BT Performance Result#1"] ? item["HE-80MHz | 5GHz"]["COEX_Performance"]["CoexUDP-RX_BT Performance Result#1"] : ''), (item["HE-80MHz | 5GHz"]["COEX_Performance"]["CoexUDP-RX_BT Performance Result#2"] ? item["HE-80MHz | 5GHz"]["COEX_Performance"]["CoexUDP-RX_BT Performance Result#2"] : ''),
                                (item["HE-80MHz | 5GHz"]["COEX_Performance"]["BT RSSI"] ? item["HE-80MHz | 5GHz"]["COEX_Performance"]["BT RSSI"] : ''), (item["HE-80MHz | 5GHz"]["COEX_Performance"]["Wi-Fi RSSI"] ? item["HE-80MHz | 5GHz"]["COEX_Performance"]["Wi-Fi RSSI"] : ''));
                        }
                    } else {
                        newRow.push('', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '');
                    }
                    if (typeof item["HT-40MHz | 2GHz"] != 'undefined') {
                        if ((typeof item["HT-40MHz | 2GHz"]["Wlan Baseline"] != 'undefined') && (typeof item["HT-40MHz | 2GHz"]["COEX_Performance"] != 'undefined')) {
                            newRow.push('', (item["HT-40MHz | 2GHz"]["Wlan Baseline"]["Baseline TCP-Tx"] ? item["HT-40MHz | 2GHz"]["Wlan Baseline"]["Baseline TCP-Tx"] : ''), (item["HT-40MHz | 2GHz"]["Wlan Baseline"]["Baseline TCP-Rx"] ? item["HT-40MHz | 2GHz"]["Wlan Baseline"]["Baseline TCP-Rx"] : ''), (item["HT-40MHz | 2GHz"]["Wlan Baseline"]["Baseline UDP-TX"] ? item["HT-40MHz | 2GHz"]["Wlan Baseline"]["Baseline UDP-TX"] : ''), (item["HT-40MHz | 2GHz"]["Wlan Baseline"]["Baseline UDP-Rx"] ? item["HT-40MHz | 2GHz"]["Wlan Baseline"]["Baseline UDP-Rx"] : ''), (item["HT-40MHz | 2GHz"]["Wlan Baseline"]["Wi-Fi RSSI"] ? item["HT-40MHz | 2GHz"]["Wlan Baseline"]["Wi-Fi RSSI"] : ''),
                                (item["HT-40MHz | 2GHz"]["COEX_Performance"]["Coex TCP-TX"] ? item["HT-40MHz | 2GHz"]["COEX_Performance"]["Coex TCP-TX"] : ''), (item["HT-40MHz | 2GHz"]["COEX_Performance"]["CoexTCP-TX_BT Performance Result#1"] ? item["HT-40MHz | 2GHz"]["COEX_Performance"]["CoexTCP-TX_BT Performance Result#1"] : ''), (item["HT-40MHz | 2GHz"]["COEX_Performance"]["CoexTCP-TX_BT Performance Result#2"] ? item["HT-40MHz | 2GHz"]["COEX_Performance"]["CoexTCP-TX_BT Performance Result#2"] : ''), (item["HT-40MHz | 2GHz"]["COEX_Performance"]["Coex TCP-RX"] ? item["HT-40MHz | 2GHz"]["COEX_Performance"]["Coex TCP-RX"] : ''),
                                (item["HT-40MHz | 2GHz"]["COEX_Performance"]["CoexTCP-RX_BT Performance Result#1"] ? item["HT-40MHz | 2GHz"]["COEX_Performance"]["CoexTCP-RX_BT Performance Result#1"] : ''), (item["HT-40MHz | 2GHz"]["COEX_Performance"]["CoexTCP-RX_BT Performance Result#2"] ? item["HT-40MHz | 2GHz"]["COEX_Performance"]["CoexTCP-RX_BT Performance Result#2"] : ''), (item["HT-40MHz | 2GHz"]["COEX_Performance"]["Coex UDP-TX"] ? item["HT-40MHz | 2GHz"]["COEX_Performance"]["Coex UDP-TX"] : ''), (item["HT-40MHz | 2GHz"]["COEX_Performance"]["CoexUDP-TX_BT Performance Result#1"] ? item["HT-40MHz | 2GHz"]["COEX_Performance"]["CoexUDP-TX_BT Performance Result#1"] : ''),
                                (item["HT-40MHz | 2GHz"]["COEX_Performance"]["CoexUDP-TX_BT Performance Result#2"] ? item["HT-40MHz | 2GHz"]["COEX_Performance"]["CoexUDP-TX_BT Performance Result#2"] : ''), (item["HT-40MHz | 2GHz"]["COEX_Performance"]["Coex UDP-RX"] ? item["HT-40MHz | 2GHz"]["COEX_Performance"]["Coex UDP-RX"] : ''), (item["HT-40MHz | 2GHz"]["COEX_Performance"]["CoexUDP-RX_BT Performance Result#1"] ? item["HT-40MHz | 2GHz"]["COEX_Performance"]["CoexUDP-RX_BT Performance Result#1"] : ''), (item["HT-40MHz | 2GHz"]["COEX_Performance"]["CoexUDP-RX_BT Performance Result#2"] ? item["HT-40MHz | 2GHz"]["COEX_Performance"]["CoexUDP-RX_BT Performance Result#2"] : ''),
                                (item["HT-40MHz | 2GHz"]["COEX_Performance"]["BT RSSI"] ? item["HT-40MHz | 2GHz"]["COEX_Performance"]["BT RSSI"] : ''), (item["HT-40MHz | 2GHz"]["COEX_Performance"]["Wi-Fi RSSI"] ? item["HT-40MHz | 2GHz"]["COEX_Performance"]["Wi-Fi RSSI"] : ''));
                        } else if (typeof item["HT-40MHz | 2GHz"]["Wlan Baseline"] != 'undefined') {
                            newRow.push('', (item["HT-40MHz | 2GHz"]["Wlan Baseline"]["Baseline TCP-Tx"] ? item["HT-40MHz | 2GHz"]["Wlan Baseline"]["Baseline TCP-Tx"] : ''), (item["HT-40MHz | 2GHz"]["Wlan Baseline"]["Baseline TCP-Rx"] ? item["HT-40MHz | 2GHz"]["Wlan Baseline"]["Baseline TCP-Rx"] : ''), (item["HT-40MHz | 2GHz"]["Wlan Baseline"]["Baseline UDP-TX"] ? item["HT-40MHz | 2GHz"]["Wlan Baseline"]["Baseline UDP-TX"] : ''), (item["HT-40MHz | 2GHz"]["Wlan Baseline"]["Baseline UDP-Rx"] ? item["HT-40MHz | 2GHz"]["Wlan Baseline"]["Baseline UDP-Rx"] : ''), (item["HT-40MHz | 2GHz"]["Wlan Baseline"]["Wi-Fi RSSI"] ? item["HT-40MHz | 2GHz"]["Wlan Baseline"]["Wi-Fi RSSI"] : ''),
                                '', '', '', '', '', '', '', '', '', '', '', '', '', '');
                        } else {
                            newRow.push('', '', '', '', '', '', (item["HT-40MHz | 2GHz"]["COEX_Performance"]["Coex TCP-TX"] ? item["HT-40MHz | 2GHz"]["COEX_Performance"]["Coex TCP-TX"] : ''), (item["HT-40MHz | 2GHz"]["COEX_Performance"]["CoexTCP-TX_BT Performance Result#1"] ? item["HT-40MHz | 2GHz"]["COEX_Performance"]["CoexTCP-TX_BT Performance Result#1"] : ''), (item["HT-40MHz | 2GHz"]["COEX_Performance"]["CoexTCP-TX_BT Performance Result#2"] ? item["HT-40MHz | 2GHz"]["COEX_Performance"]["CoexTCP-TX_BT Performance Result#2"] : ''), (item["HT-40MHz | 2GHz"]["COEX_Performance"]["Coex TCP-RX"] ? item["HT-40MHz | 2GHz"]["COEX_Performance"]["Coex TCP-RX"] : ''),
                                (item["HT-40MHz | 2GHz"]["COEX_Performance"]["CoexTCP-RX_BT Performance Result#1"] ? item["HT-40MHz | 2GHz"]["COEX_Performance"]["CoexTCP-RX_BT Performance Result#1"] : ''), (item["HT-40MHz | 2GHz"]["COEX_Performance"]["CoexTCP-RX_BT Performance Result#2"] ? item["HT-40MHz | 2GHz"]["COEX_Performance"]["CoexTCP-RX_BT Performance Result#2"] : ''), (item["HT-40MHz | 2GHz"]["COEX_Performance"]["Coex UDP-TX"] ? item["HT-40MHz | 2GHz"]["COEX_Performance"]["Coex UDP-TX"] : ''), (item["HT-40MHz | 2GHz"]["COEX_Performance"]["CoexUDP-TX_BT Performance Result#1"] ? item["HT-40MHz | 2GHz"]["COEX_Performance"]["CoexUDP-TX_BT Performance Result#1"] : ''),
                                (item["HT-40MHz | 2GHz"]["COEX_Performance"]["CoexUDP-TX_BT Performance Result#2"] ? item["HT-40MHz | 2GHz"]["COEX_Performance"]["CoexUDP-TX_BT Performance Result#2"] : ''), (item["HT-40MHz | 2GHz"]["COEX_Performance"]["Coex UDP-RX"] ? item["HT-40MHz | 2GHz"]["COEX_Performance"]["Coex UDP-RX"] : ''), (item["HT-40MHz | 2GHz"]["COEX_Performance"]["CoexUDP-RX_BT Performance Result#1"] ? item["HT-40MHz | 2GHz"]["COEX_Performance"]["CoexUDP-RX_BT Performance Result#1"] : ''), (item["HT-40MHz | 2GHz"]["COEX_Performance"]["CoexUDP-RX_BT Performance Result#2"] ? item["HT-40MHz | 2GHz"]["COEX_Performance"]["CoexUDP-RX_BT Performance Result#2"] : ''),
                                (item["HT-40MHz | 2GHz"]["COEX_Performance"]["BT RSSI"] ? item["HT-40MHz | 2GHz"]["COEX_Performance"]["BT RSSI"] : ''), (item["HT-40MHz | 2GHz"]["COEX_Performance"]["Wi-Fi RSSI"] ? item["HT-40MHz | 2GHz"]["COEX_Performance"]["Wi-Fi RSSI"] : ''));
                        }
                    } else {
                        newRow.push('', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '');
                    }
                    if (typeof item["HE-40MHz | 2GHz"] != 'undefined') {
                        if ((typeof item["HE-40MHz | 2GHz"]["Wlan Baseline"] != 'undefined') && (typeof item["HE-40MHz | 2GHz"]["COEX_Performance"] != 'undefined')) {
                            newRow.push('', (item["HE-40MHz | 2GHz"]["Wlan Baseline"]["Baseline TCP-Tx"] ? item["HE-40MHz | 2GHz"]["Wlan Baseline"]["Baseline TCP-Tx"] : ''), (item["HE-40MHz | 2GHz"]["Wlan Baseline"]["Baseline TCP-Rx"] ? item["HE-40MHz | 2GHz"]["Wlan Baseline"]["Baseline TCP-Rx"] : ''), (item["HE-40MHz | 2GHz"]["Wlan Baseline"]["Baseline UDP-TX"] ? item["HE-40MHz | 2GHz"]["Wlan Baseline"]["Baseline UDP-TX"] : ''), (item["HE-40MHz | 2GHz"]["Wlan Baseline"]["Baseline UDP-Rx"] ? item["HE-40MHz | 2GHz"]["Wlan Baseline"]["Baseline UDP-Rx"] : ''), (item["HE-40MHz | 2GHz"]["Wlan Baseline"]["Wi-Fi RSSI"] ? item["HE-40MHz | 2GHz"]["Wlan Baseline"]["Wi-Fi RSSI"] : ''),
                                (item["HE-40MHz | 2GHz"]["COEX_Performance"]["Coex TCP-TX"] ? item["HE-40MHz | 2GHz"]["COEX_Performance"]["Coex TCP-TX"] : ''), (item["HE-40MHz | 2GHz"]["COEX_Performance"]["CoexTCP-TX_BT Performance Result#1"] ? item["HE-40MHz | 2GHz"]["COEX_Performance"]["CoexTCP-TX_BT Performance Result#1"] : ''), (item["HE-40MHz | 2GHz"]["COEX_Performance"]["CoexTCP-TX_BT Performance Result#2"] ? item["HE-40MHz | 2GHz"]["COEX_Performance"]["CoexTCP-TX_BT Performance Result#2"] : ''), (item["HE-40MHz | 2GHz"]["COEX_Performance"]["Coex TCP-RX"] ? item["HE-40MHz | 2GHz"]["COEX_Performance"]["Coex TCP-RX"] : ''),
                                (item["HE-40MHz | 2GHz"]["COEX_Performance"]["CoexTCP-RX_BT Performance Result#1"] ? item["HE-40MHz | 2GHz"]["COEX_Performance"]["CoexTCP-RX_BT Performance Result#1"] : ''), (item["HE-40MHz | 2GHz"]["COEX_Performance"]["CoexTCP-RX_BT Performance Result#2"] ? item["HE-40MHz | 2GHz"]["COEX_Performance"]["CoexTCP-RX_BT Performance Result#2"] : ''), (item["HE-40MHz | 2GHz"]["COEX_Performance"]["Coex UDP-TX"] ? item["HE-40MHz | 2GHz"]["COEX_Performance"]["Coex UDP-TX"] : ''), (item["HE-40MHz | 2GHz"]["COEX_Performance"]["CoexUDP-TX_BT Performance Result#1"] ? item["HE-40MHz | 2GHz"]["COEX_Performance"]["CoexUDP-TX_BT Performance Result#1"] : ''),
                                (item["HE-40MHz | 2GHz"]["COEX_Performance"]["CoexUDP-TX_BT Performance Result#2"] ? item["HE-40MHz | 2GHz"]["COEX_Performance"]["CoexUDP-TX_BT Performance Result#2"] : ''), (item["HE-40MHz | 2GHz"]["COEX_Performance"]["Coex UDP-RX"] ? item["HE-40MHz | 2GHz"]["COEX_Performance"]["Coex UDP-RX"] : ''), (item["HE-40MHz | 2GHz"]["COEX_Performance"]["CoexUDP-RX_BT Performance Result#1"] ? item["HE-40MHz | 2GHz"]["COEX_Performance"]["CoexUDP-RX_BT Performance Result#1"] : ''), (item["HE-40MHz | 2GHz"]["COEX_Performance"]["CoexUDP-RX_BT Performance Result#2"] ? item["HE-40MHz | 2GHz"]["COEX_Performance"]["CoexUDP-RX_BT Performance Result#2"] : ''),
                                (item["HE-40MHz | 2GHz"]["COEX_Performance"]["BT RSSI"] ? item["HE-40MHz | 2GHz"]["COEX_Performance"]["BT RSSI"] : ''), (item["HE-40MHz | 2GHz"]["COEX_Performance"]["Wi-Fi RSSI"] ? item["HE-40MHz | 2GHz"]["COEX_Performance"]["Wi-Fi RSSI"] : ''));
                        } else if (typeof item["HE-40MHz | 2GHz"]["Wlan Baseline"] != 'undefined') {
                            newRow.push('', (item["HE-40MHz | 2GHz"]["Wlan Baseline"]["Baseline TCP-Tx"] ? item["HE-40MHz | 2GHz"]["Wlan Baseline"]["Baseline TCP-Tx"] : ''), (item["HE-40MHz | 2GHz"]["Wlan Baseline"]["Baseline TCP-Rx"] ? item["HE-40MHz | 2GHz"]["Wlan Baseline"]["Baseline TCP-Rx"] : ''), (item["HE-40MHz | 2GHz"]["Wlan Baseline"]["Baseline UDP-TX"] ? item["HE-40MHz | 2GHz"]["Wlan Baseline"]["Baseline UDP-TX"] : ''), (item["HE-40MHz | 2GHz"]["Wlan Baseline"]["Baseline UDP-Rx"] ? item["HE-40MHz | 2GHz"]["Wlan Baseline"]["Baseline UDP-Rx"] : ''), (item["HE-40MHz | 2GHz"]["Wlan Baseline"]["Wi-Fi RSSI"] ? item["HE-40MHz | 2GHz"]["Wlan Baseline"]["Wi-Fi RSSI"] : ''),
                                '', '', '', '', '', '', '', '', '', '', '', '', '', '');
                        } else {
                            newRow.push('', '', '', '', '', '', (item["HE-40MHz | 2GHz"]["COEX_Performance"]["Coex TCP-TX"] ? item["HE-40MHz | 2GHz"]["COEX_Performance"]["Coex TCP-TX"] : ''), (item["HE-40MHz | 2GHz"]["COEX_Performance"]["CoexTCP-TX_BT Performance Result#1"] ? item["HE-40MHz | 2GHz"]["COEX_Performance"]["CoexTCP-TX_BT Performance Result#1"] : ''), (item["HE-40MHz | 2GHz"]["COEX_Performance"]["CoexTCP-TX_BT Performance Result#2"] ? item["HE-40MHz | 2GHz"]["COEX_Performance"]["CoexTCP-TX_BT Performance Result#2"] : ''), (item["HE-40MHz | 2GHz"]["COEX_Performance"]["Coex TCP-RX"] ? item["HE-40MHz | 2GHz"]["COEX_Performance"]["Coex TCP-RX"] : ''),
                                (item["HE-40MHz | 2GHz"]["COEX_Performance"]["CoexTCP-RX_BT Performance Result#1"] ? item["HE-40MHz | 2GHz"]["COEX_Performance"]["CoexTCP-RX_BT Performance Result#1"] : ''), (item["HE-40MHz | 2GHz"]["COEX_Performance"]["CoexTCP-RX_BT Performance Result#2"] ? item["HE-40MHz | 2GHz"]["COEX_Performance"]["CoexTCP-RX_BT Performance Result#2"] : ''), (item["HE-40MHz | 2GHz"]["COEX_Performance"]["Coex UDP-TX"] ? item["HE-40MHz | 2GHz"]["COEX_Performance"]["Coex UDP-TX"] : ''), (item["HE-40MHz | 2GHz"]["COEX_Performance"]["CoexUDP-TX_BT Performance Result#1"] ? item["HE-40MHz | 2GHz"]["COEX_Performance"]["CoexUDP-TX_BT Performance Result#1"] : ''),
                                (item["HE-40MHz | 2GHz"]["COEX_Performance"]["CoexUDP-TX_BT Performance Result#2"] ? item["HE-40MHz | 2GHz"]["COEX_Performance"]["CoexUDP-TX_BT Performance Result#2"] : ''), (item["HE-40MHz | 2GHz"]["COEX_Performance"]["Coex UDP-RX"] ? item["HE-40MHz | 2GHz"]["COEX_Performance"]["Coex UDP-RX"] : ''), (item["HE-40MHz | 2GHz"]["COEX_Performance"]["CoexUDP-RX_BT Performance Result#1"] ? item["HE-40MHz | 2GHz"]["COEX_Performance"]["CoexUDP-RX_BT Performance Result#1"] : ''), (item["HE-40MHz | 2GHz"]["COEX_Performance"]["CoexUDP-RX_BT Performance Result#2"] ? item["HE-40MHz | 2GHz"]["COEX_Performance"]["CoexUDP-RX_BT Performance Result#2"] : ''),
                                (item["HE-40MHz | 2GHz"]["COEX_Performance"]["BT RSSI"] ? item["HE-40MHz | 2GHz"]["COEX_Performance"]["BT RSSI"] : ''), (item["HE-40MHz | 2GHz"]["COEX_Performance"]["Wi-Fi RSSI"] ? item["HE-40MHz | 2GHz"]["COEX_Performance"]["Wi-Fi RSSI"] : ''));
                        }
                    } else {
                        newRow.push('', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '');
                    }
                    if (typeof item["HT-40MHz | 5GHz"] != 'undefined') {
                        if ((typeof item["HT-40MHz | 5GHz"]["Wlan Baseline"] != 'undefined') && (typeof item["HT-40MHz | 5GHz"]["COEX_Performance"] != 'undefined')) {
                            newRow.push('', (item["HT-40MHz | 5GHz"]["Wlan Baseline"]["Baseline TCP-Tx"] ? item["HT-40MHz | 5GHz"]["Wlan Baseline"]["Baseline TCP-Tx"] : ''), (item["HT-40MHz | 5GHz"]["Wlan Baseline"]["Baseline TCP-Rx"] ? item["HT-40MHz | 5GHz"]["Wlan Baseline"]["Baseline TCP-Rx"] : ''), (item["HT-40MHz | 5GHz"]["Wlan Baseline"]["Baseline UDP-TX"] ? item["HT-40MHz | 5GHz"]["Wlan Baseline"]["Baseline UDP-TX"] : ''), (item["HT-40MHz | 5GHz"]["Wlan Baseline"]["Baseline UDP-Rx"] ? item["HT-40MHz | 5GHz"]["Wlan Baseline"]["Baseline UDP-Rx"] : ''), (item["HT-40MHz | 5GHz"]["Wlan Baseline"]["Wi-Fi RSSI"] ? item["HT-40MHz | 5GHz"]["Wlan Baseline"]["Wi-Fi RSSI"] : ''),
                                (item["HT-40MHz | 5GHz"]["COEX_Performance"]["Coex TCP-TX"] ? item["HT-40MHz | 5GHz"]["COEX_Performance"]["Coex TCP-TX"] : ''), (item["HT-40MHz | 5GHz"]["COEX_Performance"]["CoexTCP-TX_BT Performance Result#1"] ? item["HT-40MHz | 5GHz"]["COEX_Performance"]["CoexTCP-TX_BT Performance Result#1"] : ''), (item["HT-40MHz | 5GHz"]["COEX_Performance"]["CoexTCP-TX_BT Performance Result#2"] ? item["HT-40MHz | 5GHz"]["COEX_Performance"]["CoexTCP-TX_BT Performance Result#2"] : ''), (item["HT-40MHz | 5GHz"]["COEX_Performance"]["Coex TCP-RX"] ? item["HT-40MHz | 5GHz"]["COEX_Performance"]["Coex TCP-RX"] : ''),
                                (item["HT-40MHz | 5GHz"]["COEX_Performance"]["CoexTCP-RX_BT Performance Result#1"] ? item["HT-40MHz | 5GHz"]["COEX_Performance"]["CoexTCP-RX_BT Performance Result#1"] : ''), (item["HT-40MHz | 5GHz"]["COEX_Performance"]["CoexTCP-RX_BT Performance Result#2"] ? item["HT-40MHz | 5GHz"]["COEX_Performance"]["CoexTCP-RX_BT Performance Result#2"] : ''), (item["HT-40MHz | 5GHz"]["COEX_Performance"]["Coex UDP-TX"] ? item["HT-40MHz | 5GHz"]["COEX_Performance"]["Coex UDP-TX"] : ''), (item["HT-40MHz | 5GHz"]["COEX_Performance"]["CoexUDP-TX_BT Performance Result#1"] ? item["HT-40MHz | 5GHz"]["COEX_Performance"]["CoexUDP-TX_BT Performance Result#1"] : ''),
                                (item["HT-40MHz | 5GHz"]["COEX_Performance"]["CoexUDP-TX_BT Performance Result#2"] ? item["HT-40MHz | 5GHz"]["COEX_Performance"]["CoexUDP-TX_BT Performance Result#2"] : ''), (item["HT-40MHz | 5GHz"]["COEX_Performance"]["Coex UDP-RX"] ? item["HT-40MHz | 5GHz"]["COEX_Performance"]["Coex UDP-RX"] : ''), (item["HT-40MHz | 5GHz"]["COEX_Performance"]["CoexUDP-RX_BT Performance Result#1"] ? item["HT-40MHz | 5GHz"]["COEX_Performance"]["CoexUDP-RX_BT Performance Result#1"] : ''), (item["HT-40MHz | 5GHz"]["COEX_Performance"]["CoexUDP-RX_BT Performance Result#2"] ? item["HT-40MHz | 5GHz"]["COEX_Performance"]["CoexUDP-RX_BT Performance Result#2"] : ''),
                                (item["HT-40MHz | 5GHz"]["COEX_Performance"]["BT RSSI"] ? item["HT-40MHz | 5GHz"]["COEX_Performance"]["BT RSSI"] : ''), (item["HT-40MHz | 5GHz"]["COEX_Performance"]["Wi-Fi RSSI"] ? item["HT-40MHz | 5GHz"]["COEX_Performance"]["Wi-Fi RSSI"] : ''));
                        } else if (typeof item["HT-40MHz | 5GHz"]["Wlan Baseline"] != 'undefined') {
                            newRow.push('', (item["HT-40MHz | 5GHz"]["Wlan Baseline"]["Baseline TCP-Tx"] ? item["HT-40MHz | 5GHz"]["Wlan Baseline"]["Baseline TCP-Tx"] : ''), (item["HT-40MHz | 5GHz"]["Wlan Baseline"]["Baseline TCP-Rx"] ? item["HT-40MHz | 5GHz"]["Wlan Baseline"]["Baseline TCP-Rx"] : ''), (item["HT-40MHz | 5GHz"]["Wlan Baseline"]["Baseline UDP-TX"] ? item["HT-40MHz | 5GHz"]["Wlan Baseline"]["Baseline UDP-TX"] : ''), (item["HT-40MHz | 5GHz"]["Wlan Baseline"]["Baseline UDP-Rx"] ? item["HT-40MHz | 5GHz"]["Wlan Baseline"]["Baseline UDP-Rx"] : ''), (item["HT-40MHz | 5GHz"]["Wlan Baseline"]["Wi-Fi RSSI"] ? item["HT-40MHz | 5GHz"]["Wlan Baseline"]["Wi-Fi RSSI"] : ''),
                                '', '', '', '', '', '', '', '', '', '', '', '', '', '');
                        } else {
                            newRow.push('', '', '', '', '', '', (item["HT-40MHz | 5GHz"]["COEX_Performance"]["Coex TCP-TX"] ? item["HT-40MHz | 5GHz"]["COEX_Performance"]["Coex TCP-TX"] : ''), (item["HT-40MHz | 5GHz"]["COEX_Performance"]["CoexTCP-TX_BT Performance Result#1"] ? item["HT-40MHz | 5GHz"]["COEX_Performance"]["CoexTCP-TX_BT Performance Result#1"] : ''), (item["HT-40MHz | 5GHz"]["COEX_Performance"]["CoexTCP-TX_BT Performance Result#2"] ? item["HT-40MHz | 5GHz"]["COEX_Performance"]["CoexTCP-TX_BT Performance Result#2"] : ''), (item["HT-40MHz | 5GHz"]["COEX_Performance"]["Coex TCP-RX"] ? item["HT-40MHz | 5GHz"]["COEX_Performance"]["Coex TCP-RX"] : ''),
                                (item["HT-40MHz | 5GHz"]["COEX_Performance"]["CoexTCP-RX_BT Performance Result#1"] ? item["HT-40MHz | 5GHz"]["COEX_Performance"]["CoexTCP-RX_BT Performance Result#1"] : ''), (item["HT-40MHz | 5GHz"]["COEX_Performance"]["CoexTCP-RX_BT Performance Result#2"] ? item["HT-40MHz | 5GHz"]["COEX_Performance"]["CoexTCP-RX_BT Performance Result#2"] : ''), (item["HT-40MHz | 5GHz"]["COEX_Performance"]["Coex UDP-TX"] ? item["HT-40MHz | 5GHz"]["COEX_Performance"]["Coex UDP-TX"] : ''), (item["HT-40MHz | 5GHz"]["COEX_Performance"]["CoexUDP-TX_BT Performance Result#1"] ? item["HT-40MHz | 5GHz"]["COEX_Performance"]["CoexUDP-TX_BT Performance Result#1"] : ''),
                                (item["HT-40MHz | 5GHz"]["COEX_Performance"]["CoexUDP-TX_BT Performance Result#2"] ? item["HT-40MHz | 5GHz"]["COEX_Performance"]["CoexUDP-TX_BT Performance Result#2"] : ''), (item["HT-40MHz | 5GHz"]["COEX_Performance"]["Coex UDP-RX"] ? item["HT-40MHz | 5GHz"]["COEX_Performance"]["Coex UDP-RX"] : ''), (item["HT-40MHz | 5GHz"]["COEX_Performance"]["CoexUDP-RX_BT Performance Result#1"] ? item["HT-40MHz | 5GHz"]["COEX_Performance"]["CoexUDP-RX_BT Performance Result#1"] : ''), (item["HT-40MHz | 5GHz"]["COEX_Performance"]["CoexUDP-RX_BT Performance Result#2"] ? item["HT-40MHz | 5GHz"]["COEX_Performance"]["CoexUDP-RX_BT Performance Result#2"] : ''),
                                (item["HT-40MHz | 5GHz"]["COEX_Performance"]["BT RSSI"] ? item["HT-40MHz | 5GHz"]["COEX_Performance"]["BT RSSI"] : ''), (item["HT-40MHz | 5GHz"]["COEX_Performance"]["Wi-Fi RSSI"] ? item["HT-40MHz | 5GHz"]["COEX_Performance"]["Wi-Fi RSSI"] : ''));
                        }
                    } else {
                        newRow.push('', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '');
                    }
                    if (typeof item["HE-40MHz | 5GHz"] != 'undefined') {
                        if ((typeof item["HE-40MHz | 5GHz"]["Wlan Baseline"] != 'undefined') && (typeof item["HE-40MHz | 5GHz"]["COEX_Performance"] != 'undefined')) {
                            newRow.push('', (item["HE-40MHz | 5GHz"]["Wlan Baseline"]["Baseline TCP-Tx"] ? item["HE-40MHz | 5GHz"]["Wlan Baseline"]["Baseline TCP-Tx"] : ''), (item["HE-40MHz | 5GHz"]["Wlan Baseline"]["Baseline TCP-Rx"] ? item["HE-40MHz | 5GHz"]["Wlan Baseline"]["Baseline TCP-Rx"] : ''), (item["HE-40MHz | 5GHz"]["Wlan Baseline"]["Baseline UDP-TX"] ? item["HE-40MHz | 5GHz"]["Wlan Baseline"]["Baseline UDP-TX"] : ''), (item["HE-40MHz | 5GHz"]["Wlan Baseline"]["Baseline UDP-Rx"] ? item["HE-40MHz | 5GHz"]["Wlan Baseline"]["Baseline UDP-Rx"] : ''), (item["HE-40MHz | 5GHz"]["Wlan Baseline"]["Wi-Fi RSSI"] ? item["HE-40MHz | 5GHz"]["Wlan Baseline"]["Wi-Fi RSSI"] : ''),
                                (item["HE-40MHz | 5GHz"]["COEX_Performance"]["Coex TCP-TX"] ? item["HE-40MHz | 5GHz"]["COEX_Performance"]["Coex TCP-TX"] : ''), (item["HE-40MHz | 5GHz"]["COEX_Performance"]["CoexTCP-TX_BT Performance Result#1"] ? item["HE-40MHz | 5GHz"]["COEX_Performance"]["CoexTCP-TX_BT Performance Result#1"] : ''), (item["HE-40MHz | 5GHz"]["COEX_Performance"]["CoexTCP-TX_BT Performance Result#2"] ? item["HE-40MHz | 5GHz"]["COEX_Performance"]["CoexTCP-TX_BT Performance Result#2"] : ''), (item["HE-40MHz | 5GHz"]["COEX_Performance"]["Coex TCP-RX"] ? item["HE-40MHz | 5GHz"]["COEX_Performance"]["Coex TCP-RX"] : ''),
                                (item["HE-40MHz | 5GHz"]["COEX_Performance"]["CoexTCP-RX_BT Performance Result#1"] ? item["HE-40MHz | 5GHz"]["COEX_Performance"]["CoexTCP-RX_BT Performance Result#1"] : ''), (item["HE-40MHz | 5GHz"]["COEX_Performance"]["CoexTCP-RX_BT Performance Result#2"] ? item["HE-40MHz | 5GHz"]["COEX_Performance"]["CoexTCP-RX_BT Performance Result#2"] : ''), (item["HE-40MHz | 5GHz"]["COEX_Performance"]["Coex UDP-TX"] ? item["HE-40MHz | 5GHz"]["COEX_Performance"]["Coex UDP-TX"] : ''), (item["HE-40MHz | 5GHz"]["COEX_Performance"]["CoexUDP-TX_BT Performance Result#1"] ? item["HE-40MHz | 5GHz"]["COEX_Performance"]["CoexUDP-TX_BT Performance Result#1"] : ''),
                                (item["HE-40MHz | 5GHz"]["COEX_Performance"]["CoexUDP-TX_BT Performance Result#2"] ? item["HE-40MHz | 5GHz"]["COEX_Performance"]["CoexUDP-TX_BT Performance Result#2"] : ''), (item["HE-40MHz | 5GHz"]["COEX_Performance"]["Coex UDP-RX"] ? item["HE-40MHz | 5GHz"]["COEX_Performance"]["Coex UDP-RX"] : ''), (item["HE-40MHz | 5GHz"]["COEX_Performance"]["CoexUDP-RX_BT Performance Result#1"] ? item["HE-40MHz | 5GHz"]["COEX_Performance"]["CoexUDP-RX_BT Performance Result#1"] : ''), (item["HE-40MHz | 5GHz"]["COEX_Performance"]["CoexUDP-RX_BT Performance Result#2"] ? item["HE-40MHz | 5GHz"]["COEX_Performance"]["CoexUDP-RX_BT Performance Result#2"] : ''),
                                (item["HE-40MHz | 5GHz"]["COEX_Performance"]["BT RSSI"] ? item["HE-40MHz | 5GHz"]["COEX_Performance"]["BT RSSI"] : ''), (item["HE-40MHz | 5GHz"]["COEX_Performance"]["Wi-Fi RSSI"] ? item["HE-40MHz | 5GHz"]["COEX_Performance"]["Wi-Fi RSSI"] : ''));
                        } else if (typeof item["HE-40MHz | 5GHz"]["Wlan Baseline"] != 'undefined') {
                            newRow.push('', (item["HE-40MHz | 5GHz"]["Wlan Baseline"]["Baseline TCP-Tx"] ? item["HE-40MHz | 5GHz"]["Wlan Baseline"]["Baseline TCP-Tx"] : ''), (item["HE-40MHz | 5GHz"]["Wlan Baseline"]["Baseline TCP-Rx"] ? item["HE-40MHz | 5GHz"]["Wlan Baseline"]["Baseline TCP-Rx"] : ''), (item["HE-40MHz | 5GHz"]["Wlan Baseline"]["Baseline UDP-TX"] ? item["HE-40MHz | 5GHz"]["Wlan Baseline"]["Baseline UDP-TX"] : ''), (item["HE-40MHz | 5GHz"]["Wlan Baseline"]["Baseline UDP-Rx"] ? item["HE-40MHz | 5GHz"]["Wlan Baseline"]["Baseline UDP-Rx"] : ''), (item["HE-40MHz | 5GHz"]["Wlan Baseline"]["Wi-Fi RSSI"] ? item["HE-40MHz | 5GHz"]["Wlan Baseline"]["Wi-Fi RSSI"] : ''),
                                '', '', '', '', '', '', '', '', '', '', '', '', '', '');
                        } else {
                            newRow.push('', '', '', '', '', '', (item["HE-40MHz | 5GHz"]["COEX_Performance"]["Coex TCP-TX"] ? item["HE-40MHz | 5GHz"]["COEX_Performance"]["Coex TCP-TX"] : ''), (item["HE-40MHz | 5GHz"]["COEX_Performance"]["CoexTCP-TX_BT Performance Result#1"] ? item["HE-40MHz | 5GHz"]["COEX_Performance"]["CoexTCP-TX_BT Performance Result#1"] : ''), (item["HE-40MHz | 5GHz"]["COEX_Performance"]["CoexTCP-TX_BT Performance Result#2"] ? item["HE-40MHz | 5GHz"]["COEX_Performance"]["CoexTCP-TX_BT Performance Result#2"] : ''), (item["HE-40MHz | 5GHz"]["COEX_Performance"]["Coex TCP-RX"] ? item["HE-40MHz | 5GHz"]["COEX_Performance"]["Coex TCP-RX"] : ''),
                                (item["HE-40MHz | 5GHz"]["COEX_Performance"]["CoexTCP-RX_BT Performance Result#1"] ? item["HE-40MHz | 5GHz"]["COEX_Performance"]["CoexTCP-RX_BT Performance Result#1"] : ''), (item["HE-40MHz | 5GHz"]["COEX_Performance"]["CoexTCP-RX_BT Performance Result#2"] ? item["HE-40MHz | 5GHz"]["COEX_Performance"]["CoexTCP-RX_BT Performance Result#2"] : ''), (item["HE-40MHz | 5GHz"]["COEX_Performance"]["Coex UDP-TX"] ? item["HE-40MHz | 5GHz"]["COEX_Performance"]["Coex UDP-TX"] : ''), (item["HE-40MHz | 5GHz"]["COEX_Performance"]["CoexUDP-TX_BT Performance Result#1"] ? item["HE-40MHz | 5GHz"]["COEX_Performance"]["CoexUDP-TX_BT Performance Result#1"] : ''),
                                (item["HE-40MHz | 5GHz"]["COEX_Performance"]["CoexUDP-TX_BT Performance Result#2"] ? item["HE-40MHz | 5GHz"]["COEX_Performance"]["CoexUDP-TX_BT Performance Result#2"] : ''), (item["HE-40MHz | 5GHz"]["COEX_Performance"]["Coex UDP-RX"] ? item["HE-40MHz | 5GHz"]["COEX_Performance"]["Coex UDP-RX"] : ''), (item["HE-40MHz | 5GHz"]["COEX_Performance"]["CoexUDP-RX_BT Performance Result#1"] ? item["HE-40MHz | 5GHz"]["COEX_Performance"]["CoexUDP-RX_BT Performance Result#1"] : ''), (item["HE-40MHz | 5GHz"]["COEX_Performance"]["CoexUDP-RX_BT Performance Result#2"] ? item["HE-40MHz | 5GHz"]["COEX_Performance"]["CoexUDP-RX_BT Performance Result#2"] : ''),
                                (item["HE-40MHz | 5GHz"]["COEX_Performance"]["BT RSSI"] ? item["HE-40MHz | 5GHz"]["COEX_Performance"]["BT RSSI"] : ''), (item["HE-40MHz | 5GHz"]["COEX_Performance"]["Wi-Fi RSSI"] ? item["HE-40MHz | 5GHz"]["COEX_Performance"]["Wi-Fi RSSI"] : ''));
                        }
                    } else {
                        newRow.push('', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '');
                    }
                    newRow.push('', item["Comments"]);

                    startRow = worksheet.getRow(row_num);
                    for (let index = 0; index < newRow.length; index++) {
                        startRow.getCell(index + 1).value = newRow[index];
                    }
                    row_num += 1;
                }
                await workbook.xlsx.writeFile(file); // xlsx format generated from the above template
                console.log("file - ", file);
            });
        console.log("file return- ", file);
        return file;
    } catch (err) {
        logger.error("generateStaCoexTpReport : ", err);
    }
}

/*
    This method generates an xlsx file for the specified execution with its results amd summary.
*/
routes.prototype.generateKpiReport = async function(req, res) {
    let responseObject = {
        status: true,
        data: {}
    };
    let execution = [];

    try {
        let file;
        console.log("req.query--", req.query)
        if (req.query.project_type == 'TP') {
            console.log("In TP report");
            let results = await throughputObj.findThroughputData({ execution_id: req.query.execution_id });
            file = await generateUnifiedReport(results, req.query.execution_name, 'TP');
            console.log("file here - ", file);
            let report = path.join(__dirname, '../..', file);
            console.log("report - ", report);
            res.download(report);

        } else if (req.query.project_type == 'RvR' || req.query.project_type == 'RVR-SCBT') {
            console.log("In RvR report");
            let results = await throughputObj.findThroughputData({ execution_id: req.query.execution_id });
            execution.push(results);
            console.log("execution-", execution);
            file = await generateWlanRvrReport(execution, req.query.execution_name);
            console.log("in api", file);
            let report = path.join(__dirname, '../..', file);
            console.log("report - ", report);
            res.download(report);

        } else if (req.query.project_type == 'Simul-TP-2INTF') {
            console.log("In TP 2INTF report");
            let results = await throughputObj.findThroughputData({ execution_id: req.query.execution_id });
            file = await generate2IntfReport(results, req.query.execution_name);
            console.log("file here - ", file);
            let report = path.join(__dirname, '../..', file);
            console.log("report - ", report);
            res.download(report);

        } else if (req.query.project_type == 'Simul-TP-3INTF') {
            console.log("In TP 3INTF report");
            let results = await throughputObj.findThroughputData({ execution_id: req.query.execution_id });
            file = await generate3IntfReport(results, req.query.execution_name);
            console.log("file here - ", file);
            let report = path.join(__dirname, '../..', file);
            console.log("report - ", report);
            res.download(report);

        } else if (req.query.project_type == 'Simul-TP-4INTF') {
            console.log("In TP 4INTF report");
            let results = await throughputObj.findThroughputData({ execution_id: req.query.execution_id });
            file = await generate4IntfReport(results, req.query.execution_name);
            console.log("file here - ", file);
            let report = path.join(__dirname, '../..', file);
            console.log("report - ", report);
            res.download(report);

        } else if (req.query.project_type == 'DL-11ax-MU-MIMO') {
            console.log("In DL-11ax report");
            let results = await throughputObj.findThroughputData({ execution_id: req.query.execution_id });
            file = await generateDL11axReport(results, req.query.execution_name);
            console.log("file here - ", file);
            let report = path.join(__dirname, '../..', file);
            console.log("report - ", report);
            res.download(report);

        } else if (req.query.project_type == 'UL-11ax-MU-MIMO') {
            console.log("In UL-11ax report");
            let results = await throughputObj.findThroughputData({ execution_id: req.query.execution_id });
            file = await generateUL11axReport(results, req.query.execution_name);
            console.log("file here - ", file);
            let report = path.join(__dirname, '../..', file);
            console.log("report - ", report);
            res.download(report);

        } else if (req.query.project_type == 'DL-11ac-MU-MIMO') {
            console.log("In DL-11ac report");
            let results = await throughputObj.findThroughputData({ execution_id: req.query.execution_id });
            file = await generateDL11acReport(results, req.query.execution_name);
            console.log("file here - ", file);
            let report = path.join(__dirname, '../..', file);
            console.log("report - ", report);
            res.download(report);
        } else if (req.query.project_type == 'OFDMA-DL') {
            console.log("In OFDMA-DL report");
            let results = await throughputObj.findThroughputData({ execution_id: req.query.execution_id });
            file = await generateOfdmaDlReport(results, req.query.execution_name);
            console.log("file here - ", file);
            let report = path.join(__dirname, '../..', file);
            console.log("report - ", report);
            res.download(report);
        } else if (req.query.project_type == 'OFDMA-UL') {
            console.log("In OFDMA-UL report");
            let results = await throughputObj.findThroughputData({ execution_id: req.query.execution_id });
            file = await generateOfdmaUlReport(results, req.query.execution_name);
            console.log("file here - ", file);
            let report = path.join(__dirname, '../..', file);
            console.log("report - ", report);
            res.download(report);
        } else if (req.query.project_type == 'IOP-Perf') {
            console.log("In IOP-Perf report");
            let results = await throughputObj.findThroughputData({ execution_id: req.query.execution_id });
            file = await generateIopPerfReport(results, req.query.execution_name);
            console.log("file here - ", file);
            let report = path.join(__dirname, '../..', file);
            console.log("report - ", report);
            res.download(report);
        } else if (req.query.project_type == 'BAT-CABLE-UP') {
            console.log("In BAT CABLE UP report");
            let results = await throughputObj.findThroughputData({ execution_id: req.query.execution_id });
            file = await generateBatCableUpReport(results, req.query.execution_name);
            console.log("file here - ", file);
            let report = path.join(__dirname, '../..', file);
            console.log("report - ", report);
            res.download(report);
        } else if (req.query.project_type == 'BAT-OTA') {
            console.log("In BAT-OTA report");
            let results = await throughputObj.findThroughputData({ execution_id: req.query.execution_id });
            file = await generateBatCableUpReport(results, req.query.execution_name);
            console.log("file here - ", file);
            let report = path.join(__dirname, '../..', file);
            console.log("report - ", report);
            res.download(report);
        } else if (req.query.project_type == 'MBSS-SCBT') {
            console.log("In MBSS-SCBT report");
            let results = await throughputObj.findThroughputData({ execution_id: req.query.execution_id });
            file = await generateMbssScbtReport(results, req.query.execution_name);
            console.log("file here - ", file);
            let report = path.join(__dirname, '../..', file);
            console.log("report - ", report);
            res.download(report);
        } else if (req.query.project_type == 'STA-CPU-Util') {
            console.log("In STA-CPU-Util report");
            let results = await throughputObj.findThroughputData({ execution_id: req.query.execution_id });
            file = await generateStaCPuUtilReport(results, req.query.execution_name);
            console.log("file here - ", file);
            let report = path.join(__dirname, '../..', file);
            console.log("report - ", report);
            res.download(report);
        } else if (req.query.project_type == 'DBC-Cpu-Util') {
            console.log("In DBC-Cpu-Util report");
            let results = await throughputObj.findThroughputData({ execution_id: req.query.execution_id });
            file = await generateDbcCPuUtilReport(results, req.query.execution_name);
            console.log("file here - ", file);
            let report = path.join(__dirname, '../..', file);
            console.log("report - ", report);
            res.download(report);
        } else if (req.query.project_type == 'IOP-TP') {
            console.log("In IOP-TP report");
            let results = await throughputObj.findThroughputData({ execution_id: req.query.execution_id });
            file = await generateIopTpReport(results, req.query.execution_name);
            console.log("file here - ", file);
            let report = path.join(__dirname, '../..', file);
            console.log("report - ", report);
            res.download(report);
        } else if (req.query.project_type == 'REVERB-OTA-RVR') {
            console.log("In REVERB-OTA-RVR report");
            let results = await throughputObj.findThroughputData({ execution_id: req.query.execution_id });
            execution.push(results);
            console.log("execution-", execution);
            file = await generateOtaRvrReport(execution, req.query.execution_name);
            console.log("in api", file);
            let report = path.join(__dirname, '../..', file);
            console.log("report - ", report);
            res.download(report);
        } else if (req.query.project_type == 'REVERB-OTA-REVERSE-RVR') {
            console.log("In REVERB-OTA-REVERSE-RVR report");
            let results = await throughputObj.findThroughputData({ execution_id: req.query.execution_id });
            execution.push(results);
            console.log("execution-", execution);
            file = await generateReverseOtaRvrReport(execution, req.query.execution_name);
            console.log("in api", file);
            let report = path.join(__dirname, '../..', file);
            console.log("report - ", report);
            res.download(report);
        } else if (req.query.project_type == 'Coex-Simul-TP-2INTF') {
            console.log("In Coex-Simul-TP-2INTF report");
            let results = await throughputObj.findThroughputData({ execution_id: req.query.execution_id });
            file = await generateCoexSimulTp2IntfReport(results, req.query.execution_name);
            console.log("file here - ", file);
            let report = path.join(__dirname, '../..', file);
            console.log("report - ", report);
            res.download(report);
        } else if (req.query.project_type == 'Coex-Simul-TP-3INTF') {
            console.log("In Coex-Simul-TP-3INTF report");
            let results = await throughputObj.findThroughputData({ execution_id: req.query.execution_id });
            file = await generateCoexSimulTp3IntfReport(results, req.query.execution_name);
            console.log("file here - ", file);
            let report = path.join(__dirname, '../..', file);
            console.log("report - ", report);
            res.download(report);
        } else if (req.query.project_type == 'STA-Coex-TP') {
            console.log("In STA-Coex-TP report");
            let results = await throughputObj.findThroughputData({ execution_id: req.query.execution_id });
            file = await generateStaCoexTpReport(results, req.query.execution_name);
            console.log("file here - ", file);
            let report = path.join(__dirname, '../..', file);
            console.log("report - ", report);
            res.download(report);
        } else if (req.query.project_type == 'P2P-Coex-TP') {
            console.log("In P2P-Coex-TP report");
            let results = await throughputObj.findThroughputData({ execution_id: req.query.execution_id });
            file = await generateStaCoexTpReport(results, req.query.execution_name);
            console.log("file here - ", file);
            let report = path.join(__dirname, '../..', file);
            console.log("report - ", report);
            res.download(report);
        } else if (req.query.project_type == 'MMH-Coex-TP') {
            console.log("In MMH-Coex-TP report");
            let results = await throughputObj.findThroughputData({ execution_id: req.query.execution_id });
            file = await generateStaCoexTpReport(results, req.query.execution_name);
            console.log("file here - ", file);
            let report = path.join(__dirname, '../..', file);
            console.log("report - ", report);
            res.download(report);
        } else if (req.query.project_type == 'BT-Throughput') {
            console.log("In BT-Throughput report");
            let results = await throughputObj.findThroughputData({ execution_id: req.query.execution_id });
            file = await generateBT_ThroughputReport(results, req.query.execution_name, 'BT-Throughput');
            console.log("file here - ", file);
            let report = path.join(__dirname, '../..', file);
            console.log("report - ", report);
            res.download(report);
        } else if (req.query.project_type == 'BT-MOS') {
            console.log("In BT-Throughput report");
            let results = await throughputObj.findThroughputData({ execution_id: req.query.execution_id });
            file = await generateBT_MOSReport(results, req.query.execution_name, 'BT-MOS');
            console.log("file here - ", file);
            let report = path.join(__dirname, '../..', file);
            console.log("report - ", report);
            res.download(report);
        } else if (req.query.project_type == 'BT-Dual-HFP') {
            console.log("In BT-Dual-HFP report");
            let results = await throughputObj.findThroughputData({ execution_id: req.query.execution_id });
            file = await generateBT_Dual_HFPReport(results, req.query.execution_name, 'BT-Dual-HFP');
            console.log("file here - ", file);
            let report = path.join(__dirname, '../..', file);
            console.log("report - ", report);
            res.download(report);
        } else if (req.query.project_type == 'BLE-Throughput') {
            console.log("In BLE-Throughput report");
            let results = await throughputObj.findThroughputData({ execution_id: req.query.execution_id });
            file = await generateBLE_ThroughputReport(results, req.query.execution_name, 'BLE-Throughput');
            console.log("file here - ", file);
            let report = path.join(__dirname, '../..', file);
            console.log("report - ", report);
            res.download(report);
        } else if (req.query.project_type == 'BT-RvR') {
            console.log("In BT-RvR report");
            let results = await throughputObj.findThroughputData({ execution_id: req.query.execution_id });
            file = await generateBT_RvRReport(results, req.query.execution_name, 'BT-RvR');
            console.log("file here - ", file);
            let report = path.join(__dirname, '../..', file);
            console.log("report - ", report);
            res.download(report);
        } else if (req.query.project_type == 'COEX-BT-RVR') {
            console.log("In COEX-BT-RVR report");
            let results = await throughputObj.findThroughputData({ execution_id: req.query.execution_id });
            file = await generateCoex_Sets_GenericReport(results, req.query.execution_name, 'COEX-BT-RVR');
            console.log("file here - ", file);
            let report = path.join(__dirname, '../..', file);
            console.log("report - ", report);
            res.download(report);
        } else if (req.query.project_type == 'COEX-WiFi-RVR') {
            console.log("In COEX-BT-RVR report");
            let results = await throughputObj.findThroughputData({ execution_id: req.query.execution_id });
            file = await generateCoex_Sets_GenericReport(results, req.query.execution_name, 'COEX-WiFi-RVR');
            console.log("file here - ", file);
            let report = path.join(__dirname, '../..', file);
            console.log("report - ", report);
            res.download(report);
        } else if (req.query.project_type == 'COEX-BT-WiFi-RVR') {
            console.log("In COEX-BT-RVR report");
            let results = await throughputObj.findThroughputData({ execution_id: req.query.execution_id });
            file = await generateCoex_Sets_GenericReport(results, req.query.execution_name, 'COEX-BT-WiFi-RVR');
            console.log("file here - ", file);
            let report = path.join(__dirname, '../..', file);
            console.log("report - ", report);
            res.download(report);
        } else if (req.query.project_type == 'LE-Long-Range-RvR') {
            console.log("In LE-Long-Range-RvR report");
            let results = await throughputObj.findThroughputData({ execution_id: req.query.execution_id });
            file = await generateLE_Long_Range_RvRReport(results, req.query.execution_name, 'LE-Long-Range-RvR');
            console.log("file here - ", file);
            let report = path.join(__dirname, '../..', file);
            console.log("report - ", report);
            res.download(report);
        } else if (req.query.project_type == 'BLE-RvR') {
            console.log("In BLE-RvR report");
            let results = await throughputObj.findThroughputData({ execution_id: req.query.execution_id });
            file = await generateBLE_RvRReport(results, req.query.execution_name, 'BLE-RvR');
            console.log("file here - ", file);
            let report = path.join(__dirname, '../..', file);
            console.log("report - ", report);
            res.download(report);
        } else if (req.query.project_type == 'CC') {
            console.log("In CC report");
            let results = await throughputObj.findThroughputData({ execution_id: req.query.execution_id });
            file = await generateCCReport(results, req.query.execution_name, 'CC');
            console.log("file here - ", file);
            let report = path.join(__dirname, '../..', file);
            console.log("report - ", report);
            res.download(report);
        } else if (req.query.project_type == 'DFS') {
            console.log("In DFS report");
            let results = await throughputObj.findThroughputData({ execution_id: req.query.execution_id });
            file = await generateDFSReport(results, req.query.execution_name, 'DFS');
            console.log("file here - ", file);
            let report = path.join(__dirname, '../..', file);
            console.log("report - ", report);
            res.download(report);
        } else if (req.query.project_type == 'WACP_Coex') {
            console.log("In WACP_Coex report");
            let results = await throughputObj.findThroughputData({ execution_id: req.query.execution_id });
            file = await generateWACP_CoexReport(results, req.query.execution_name, 'WACP_Coex');
            console.log("file here - ", file);
            let report = path.join(__dirname, '../..', file);
            console.log("report - ", report);
            res.download(report);
        } else if (req.query.project_type == 'WACP_Wifi') {
            console.log("In WACP_Wifi report");
            let results = await throughputObj.findThroughputData({ execution_id: req.query.execution_id });
            file = await generateWACP_WifiReport(results, req.query.execution_name, 'WACP_Wifi');
            console.log("file here - ", file);
            let report = path.join(__dirname, '../..', file);
            console.log("report - ", report);
            res.download(report);
        } else {
            throw "No templates found to generate the report."
        }
        // res.json(responseObject);
    } catch (err) {
        logger.error("generateKpiReport : ", err);
        responseError(res, responseObject, "Failed to generate the KPI report");
    }
}

/*
    This method generates an xlsx file for the specified execution with its results amd summary.
*/
routes.prototype.generateComparisonReport = async function(req, res) {
    let responseObject = {
        status: true,
        data: {}
    };

    try {
        console.log("req.body--", req.body)

        let file;
        let results;
        let executions = []
        let etp;
        let ttp;
        let benchmarksRes;

        let executionIDs = req.body.execution_id;
        let benchmarks = req.body.labels; //['_ALL_', 'C', 'A'];

        if (req.body.project_type == 'TP') {
            console.log("In TP report");

            // Added new line for Export with ETP, TTP & Benchmark values
            etp = await throughputObj.findThroughputData({ "TP TYPE": "ETP" });
            ttp = await throughputObj.findThroughputData({ "TP TYPE": "TTP" });

            //var benchmarksAll = _.filter(benchmarks, function(val) { return val == '_ALL_'; });
            var benchmarksWithout = _.without(benchmarks, '_ALL_');

            if (benchmarks == '_ALL_') {
                benchmarksRes = await throughputObj.findThroughputData({ project_type: 'TP', isBenchmark: true });
                // benchmarksData.push(benchmarksRes);
                console.log("req if --", benchmarks);
            } else {
                benchmarksRes = await throughputObj.findThroughputData({ project_type: 'TP', isBenchmark: true, benchmark_label: { $in: benchmarksWithout } });
                //benchmarksData.push(benchmarksRes);
                console.log("req else --", benchmarks);
            }

            console.log("benchmarksRes count--", benchmarksRes.length);

            executions.push(etp);
            executions.push(ttp);
            executions.push(benchmarksRes);
            // End of new line for Export - ETP, TTP & Benchmark

            for (let item of executionIDs) {
                results = await throughputObj.findThroughputData({ execution_id: item });
                executions.push(results);
            }
            file = await generateTPCompareReport(executions, "compare_", benchmarksRes.length, req.body);
            let report = path.join(__dirname, '../..', file);
            res.download(report);

        } else if (req.body.project_type == 'RvR' || req.body.project_type == 'RVR-SCBT') {
            console.log("In RvR report");

            // Added new line for Export with Benchmark values
            //var benchmarksAll = _.filter(benchmarks, function(val) { return val == '_ALL_'; });
            var benchmarksWithout = _.without(benchmarks, '_ALL_');

            if (benchmarks == '_ALL_') {
                benchmarksRes = await throughputObj.findThroughputData({ project_type: req.body.project_type, isBenchmark: true });
                // benchmarksData.push(benchmarksRes);
                console.log("req if --", benchmarks);
            } else {
                benchmarksRes = await throughputObj.findThroughputData({ project_type: req.body.project_type, isBenchmark: true, benchmark_label: { $in: benchmarksWithout } });
                //benchmarksData.push(benchmarksRes);
                console.log("req else --", benchmarks);
            }

            executions.push(benchmarksRes);
            console.log("benchmarksRes count--", benchmarksRes.length);

            // End of new line for Export - ETP, TTP & Benchmark

            for (let item of executionIDs) {
                results = await throughputObj.findThroughputData({ execution_id: item });
                executions.push(results);
            }
            file = await generateWlanRvrReport(executions, "Compare");
            let report = path.join(__dirname, '../..', file);
            console.log("report - ", report);
            res.download(report);
        } else {
            throw "No templates found to generate the report."
        }
        // res.json(responseObject);
    } catch (err) {
        logger.error("generateKpiReport : ", err);
        responseError(res, responseObject, "Failed to generate the KPI report");
    }
}

/*
    This method generates an xlsx file for the specified execution with its results amd summary.
*/
routes.prototype.generateMergedKpiReport = async function(req, res) {
    let responseObject = {
        status: true,
        data: {}
    };
    let execution = [];

    try {
        let file;
        console.log("req.query--", req.query)
        if (req.query.project_type == 'TP') {
            console.log("In TP report");
            let results = await throughputObj.getDetailedReport(req.query.reportId);
            file = await generateUnifiedReport(results, "MergeTP_");
            console.log("file here - ", file);
            let report = path.join(__dirname, '../..', file);
            console.log("report - ", report);
            res.download(report);

        } else if (req.query.project_type == 'RvR') {
            console.log("In RvR report");
            let results = await throughputObj.getDetailedReport(req.query.reportId);
            console.log("results--", results);
            execution.push(results);
            console.log("execution--", execution);
            file = await generateWlanRvrMergedReport(execution, "MergeRvR");
            console.log("in api", file);
            let report = path.join(__dirname, '../..', file);
            console.log("report - ", report);
            res.download(report);
        } else {
            throw "No templates found to generate the report."
        }
        // res.json(responseObject);
    } catch (err) {
        logger.error("generateKpiReport : ", err);
        responseError(res, responseObject, "Failed to generate the KPI report");
    }
}


/*
    This method generates an xlsx file the Functionality report(Pass/Fail) according to the template
    for multiple executions by comparing the results.
*/
routes.prototype.generateFunctionalityReport = async function(req, res) {
    try {
        let executionName = [];
        let results = await functionalityComparison(req.query.execution_id);
        _.each(req.query.execution_id, async function(item) {
            let exeNames = await executionObj.getExecution(item);
            executionName.push({ name: exeNames[0].name, id: item });
        });

        let file = await functionalityReport(results, executionName);
        let report = path.join(__dirname, '../..', file);
        console.log("report - ", report);
        res.download(report);

    } catch (err) {
        logger.error("generateFunctionalityReport : ", err);
        responseError(res, responseObject, "Failed to generate the Functionality report.");
    }
}


/*
    Creates a new xlsx excel workbook from the existing BT template for given BT_Throughput execution.
*/
async function generateBT_ThroughputReport(data, executionName, proj_type) {

    try {
        const workbook = new ExcelJS.Workbook(); // creates a new workbook
        let templateFile = config.public.path + config.public.templates + "BT_Templates.xlsx";
        let file = config.public.path + config.public.output + executionName + 'KPI_Report.xlsx';

        await workbook.xlsx.readFile(templateFile)
            .then(async function() {
                let worksheet = workbook.getWorksheet("BT-THROUGHPUT"); // get particular sheet
                let row_num = 7;
                let startRow = worksheet.getRow(row_num);

                for (let item of data) {
                    if (item['project_type'] == proj_type) {
                        let newRow = [''];
                        /* Static column values for TP KPI data */
                        newRow.push(item["DUT"], item["Soc Version"], item["SocType"], item["DUT Fw"],
                            item["Interface"], item["DUT Os"], item["DUT Host Platform"], item["Packet Type"], item["Theoretical Val (kbps)"],
                            item["Baseline(95% of Theoretical val)(Kbps)"]);


                        if (typeof item["Uni-DirectionalTx-Rx Traffic(TP Values in Kbps)"] != 'undefined') {
                            if (typeof item["Uni-DirectionalTx-Rx Traffic(TP Values in Kbps)"]["E0"] != 'undefined') {

                                if (typeof item["Uni-DirectionalTx-Rx Traffic(TP Values in Kbps)"]["E0"]["Master"] != 'undefined') {
                                    if (typeof item["Uni-DirectionalTx-Rx Traffic(TP Values in Kbps)"]["E0"]["Master"]["Tx"] != 'undefined') {
                                        newRow.push((item["Uni-DirectionalTx-Rx Traffic(TP Values in Kbps)"]["E0"]["Master"]["Tx"] ? item["Uni-DirectionalTx-Rx Traffic(TP Values in Kbps)"]["E0"]["Master"]["Tx"] : ''));
                                    } else { newRow.push('') }
                                    if (typeof item["Uni-DirectionalTx-Rx Traffic(TP Values in Kbps)"]["E0"]["Master"]["Rx"] != 'undefined') {
                                        newRow.push((item["Uni-DirectionalTx-Rx Traffic(TP Values in Kbps)"]["E0"]["Master"]["Rx"] ? item["Uni-DirectionalTx-Rx Traffic(TP Values in Kbps)"]["E0"]["Master"]["Rx"] : ''));
                                    } else { newRow.push('') }
                                } else { newRow.push('', '') }

                                if (typeof item["Uni-DirectionalTx-Rx Traffic(TP Values in Kbps)"]["E0"]["Slave"] != 'undefined') {

                                    if (typeof item["Uni-DirectionalTx-Rx Traffic(TP Values in Kbps)"]["E0"]["Slave"]["Tx"] != 'undefined') {

                                        newRow.push((item["Uni-DirectionalTx-Rx Traffic(TP Values in Kbps)"]["E0"] ? item["Uni-DirectionalTx-Rx Traffic(TP Values in Kbps)"]["E0"]["Slave"]["Tx"] : ''));
                                    } else { newRow.push('') }
                                    if (typeof item["Uni-DirectionalTx-Rx Traffic(TP Values in Kbps)"]["E0"]["Slave"]["Rx"] != 'undefined') {

                                        newRow.push((item["Uni-DirectionalTx-Rx Traffic(TP Values in Kbps)"]["E0"] ? item["Uni-DirectionalTx-Rx Traffic(TP Values in Kbps)"]["E0"]["Slave"]["Rx"] : ''));
                                    } else { newRow.push('') }
                                } else { newRow.push('', '') }

                            } else { newRow.push('', '', '', ''); }

                            if (typeof item["Uni-DirectionalTx-Rx Traffic(TP Values in Kbps)"]["AES"] != 'undefined') {


                                if (typeof item["Uni-DirectionalTx-Rx Traffic(TP Values in Kbps)"]["AES"]["Master"] != 'undefined') {

                                    if (typeof item["Uni-DirectionalTx-Rx Traffic(TP Values in Kbps)"]["AES"]["Master"]["Tx"] != 'undefined') {

                                        newRow.push((item["Uni-DirectionalTx-Rx Traffic(TP Values in Kbps)"]["AES"]["Master"]["Tx"] ? item["Uni-DirectionalTx-Rx Traffic(TP Values in Kbps)"]["AES"]["Master"]["Tx"] : ''));
                                    } else { newRow.push('') }
                                    if (typeof item["Uni-DirectionalTx-Rx Traffic(TP Values in Kbps)"]["AES"]["Master"]["Rx"] != 'undefined') {

                                        newRow.push((item["Uni-DirectionalTx-Rx Traffic(TP Values in Kbps)"]["AES"]["Master"]["Rx"] ? item["Uni-DirectionalTx-Rx Traffic(TP Values in Kbps)"]["AES"]["Master"]["Rx"] : ''));
                                    } else { newRow.push('') }
                                } else { newRow.push('', '') }

                                if (typeof item["Uni-DirectionalTx-Rx Traffic(TP Values in Kbps)"]["AES"]["Slave"] != 'undefined') {

                                    if (typeof item["Uni-DirectionalTx-Rx Traffic(TP Values in Kbps)"]["AES"]["Slave"]["Tx"] != 'undefined') {

                                        newRow.push((item["Uni-DirectionalTx-Rx Traffic(TP Values in Kbps)"]["AES"] ? item["Uni-DirectionalTx-Rx Traffic(TP Values in Kbps)"]["AES"]["Slave"]["Tx"] : ''));
                                    } else { newRow.push('') }
                                    if (typeof item["Uni-DirectionalTx-Rx Traffic(TP Values in Kbps)"]["AES"]["Slave"]["Rx"] != 'undefined') {

                                        newRow.push((item["Uni-DirectionalTx-Rx Traffic(TP Values in Kbps)"]["AES"] ? item["Uni-DirectionalTx-Rx Traffic(TP Values in Kbps)"]["AES"]["Slave"]["Rx"] : ''));
                                    } else { newRow.push('') }
                                } else { newRow.push('', '') }

                            } else { newRow.push('', '', '', ''); }
                        } else { newRow.push('', '', '', '', '', '', '', ''); }



                        /*-------------- Bi-DirectionalTx-Rx Traffic(TP Values in Kbps) -----------------*/
                        if (typeof item["Bi-DirectionalTx-Rx Traffic(TP Values in Kbps)"] != 'undefined') {

                            if (typeof item["Bi-DirectionalTx-Rx Traffic(TP Values in Kbps)"]["E0"] != 'undefined') {

                                if (typeof item["Bi-DirectionalTx-Rx Traffic(TP Values in Kbps)"]["E0"]["Master"] != 'undefined') {

                                    if (typeof item["Bi-DirectionalTx-Rx Traffic(TP Values in Kbps)"]["E0"]["Master"]["Tx"] != 'undefined') {
                                        newRow.push((item["Bi-DirectionalTx-Rx Traffic(TP Values in Kbps)"]["E0"]["Master"]["Tx"] ? item["Bi-DirectionalTx-Rx Traffic(TP Values in Kbps)"]["E0"]["Master"]["Tx"] : ''))
                                    } else { newRow.push('') }
                                    if (typeof item["Bi-DirectionalTx-Rx Traffic(TP Values in Kbps)"]["E0"]["Master"]["Rx"] != 'undefined') {
                                        newRow.push((item["Bi-DirectionalTx-Rx Traffic(TP Values in Kbps)"]["E0"]["Master"]["Rx"] ? item["Bi-DirectionalTx-Rx Traffic(TP Values in Kbps)"]["E0"]["Master"]["Rx"] : ''))
                                    } else { newRow.push('') }
                                } else { newRow.push('', '') }

                                if (typeof(item["Bi-DirectionalTx-Rx Traffic(TP Values in Kbps)"]["E0"]["Slave"]) != 'undefined') {

                                    if (typeof(item["Bi-DirectionalTx-Rx Traffic(TP Values in Kbps)"]["E0"]["Slave"]["Tx"]) != 'undefined') {
                                        newRow.push((item["Bi-DirectionalTx-Rx Traffic(TP Values in Kbps)"]["E0"]["Slave"] ? item["Bi-DirectionalTx-Rx Traffic(TP Values in Kbps)"]["E0"]["Slave"]["Tx"] : ''))
                                    } else { newRow.push('') }
                                    if (typeof item["Bi-DirectionalTx-Rx Traffic(TP Values in Kbps)"]["E0"]["Slave"]["Rx"] != 'undefined') {
                                        newRow.push((item["Bi-DirectionalTx-Rx Traffic(TP Values in Kbps)"]["E0"]["Slave"] ? item["Bi-DirectionalTx-Rx Traffic(TP Values in Kbps)"]["E0"]["Slave"]["Rx"] : ''))
                                    } else { newRow.push('') }
                                } else { newRow.push('', '') }

                            } else { newRow.push('', '', '', '') }

                            if (typeof item["Bi-DirectionalTx-Rx Traffic(TP Values in Kbps)"]["AES"] != 'undefined') {

                                if (typeof item["Bi-DirectionalTx-Rx Traffic(TP Values in Kbps)"]["AES"]["Master"] != 'undefined') {

                                    if (typeof item["Bi-DirectionalTx-Rx Traffic(TP Values in Kbps)"]["AES"]["Master"]["Tx"] != 'undefined') {
                                        newRow.push((item["Bi-DirectionalTx-Rx Traffic(TP Values in Kbps)"]["AES"]["Master"]["Tx"] ? item["Bi-DirectionalTx-Rx Traffic(TP Values in Kbps)"]["AES"]["Master"]["Tx"] : ''));
                                    } else { newRow.push('') }
                                    if (typeof item["Bi-DirectionalTx-Rx Traffic(TP Values in Kbps)"]["AES"]["Master"]["Rx"] != 'undefined') {
                                        newRow.push((item["Bi-DirectionalTx-Rx Traffic(TP Values in Kbps)"]["AES"]["Master"]["Rx"] ? item["Bi-DirectionalTx-Rx Traffic(TP Values in Kbps)"]["AES"]["Master"]["Rx"] : ''));
                                    } else { newRow.push('') }
                                } else { newRow.push('', '') }
                                if (typeof item["Bi-DirectionalTx-Rx Traffic(TP Values in Kbps)"]["AES"]["Slave"] != 'undefined') {

                                    if (typeof item["Bi-DirectionalTx-Rx Traffic(TP Values in Kbps)"]["AES"]["Slave"]["Tx"] != 'undefined') {

                                        newRow.push((item["Bi-DirectionalTx-Rx Traffic(TP Values in Kbps)"]["AES"]["Slave"]["Tx"] ? item["Bi-DirectionalTx-Rx Traffic(TP Values in Kbps)"]["AES"]["Slave"]["Tx"] : ''));
                                    } else { newRow.push('') }
                                    if (typeof item["Bi-DirectionalTx-Rx Traffic(TP Values in Kbps)"]["AES"]["Slave"]["Rx"] != 'undefined') {
                                        newRow.push((item["Bi-DirectionalTx-Rx Traffic(TP Values in Kbps)"]["AES"]["Slave"]["Rx"] ? item["Bi-DirectionalTx-Rx Traffic(TP Values in Kbps)"]["AES"]["Slave"]["Rx"] : ''));
                                    } else { newRow.push('') }

                                } else { newRow.push('', '') }
                            } else { newRow.push('', '', '', ''); }
                        } else {
                            newRow.push('', '', '', '', '', '', '', '');
                        }


                        startRow = worksheet.getRow(row_num);
                        for (let index = 0; index < newRow.length; index++) {
                            startRow.getCell(index + 1).value = newRow[index];
                        }
                        row_num += 1;
                    }
                }
                await workbook.xlsx.writeFile(file); // xlsx format generated from the above template
                console.log("file - ", file);
            });
        console.log("file return- ", file);
        return file;
    } catch (err) {
        logger.error("generateUnifiedReport : ", err);
    }
}

/*
    Creates a new xlsx excel workbook from the existing BT template for given BT_MOS execution.
*/
async function generateBT_MOSReport(data, executionName, proj_type) {

    try {
        console.log("execution name--->", executionName)
        const workbook = new ExcelJS.Workbook(); // creates a new workbook
        let templateFile = config.public.path + config.public.templates + "BT_Templates.xlsx";
        console.log("template file---> ", templateFile)
        let file = config.public.path + config.public.output + executionName + 'KPI_Report.xlsx';
        console.log("Kpi report ---> ", file)

        await workbook.xlsx.readFile(templateFile)
            .then(async function() {
                let worksheet = workbook.getWorksheet("BT-MOS"); // get particular sheet
                let row_num = 5;
                let startRow = worksheet.getRow(row_num);

                for (let item of data) {
                    if (item['project_type'] == proj_type) {
                        let newRow = [''];
                        //console.log("item--", item["Uni-DirectionalTx-Rx Traffic(TP Values in Kbps)"]["E0"]["Master"]["Tx"]);
                        /* Static column values for TP KPI data */
                        newRow.push(item["DUT"], item["SoC Version"], item["SoC Type"], item["DUT FW"],
                            item["Interface"], item["DUT OS"], item["DUT Host Platform"], item["Audio path"], item["HFP Interface"],
                            item["DUT Controller Role wrt Codec (Master/Slave)"], item["DUT BT Role(Master/ Role)"], item["Packet Type"], item["Retransmission"], item["Max Latency"], item["Air mode"],
                            item["Mos baseline"]);

                        if (typeof item["Mos score"] != 'undefined') {
                            if (typeof item["Mos score"]["Tx"] != 'undefined') {
                                newRow.push(item["Mos score"] ? item["Mos score"]["Tx"] : '');
                            } else { newRow.push('') }
                            if (typeof item["Mos score"]["Rx"] != 'undefined') {
                                newRow.push(item["Mos score"] ? item["Mos score"]["Rx"] : '');

                            } else { newRow.push('') }

                        } else { newRow.push('', '') }

                        startRow = worksheet.getRow(row_num);
                        for (let index = 0; index < newRow.length; index++) {
                            startRow.getCell(index + 1).value = newRow[index];
                        }
                        row_num += 1;
                    }
                }
                await workbook.xlsx.writeFile(file); // xlsx format generated from the above template
                console.log("file - ", file);
            });
        console.log("file return- ", file);
        return file;
    } catch (err) {
        logger.error("generateUnifiedReport : ", err);
    }
}

/*
    Creates a new xlsx excel workbook from the existing Unified BT template for given BT_Dual_HFP execution.
*/
async function generateBT_Dual_HFPReport(data, executionName, proj_type) {

    try {
        console.log("execution name--->", executionName)
        const workbook = new ExcelJS.Workbook(); // creates a new workbook
        let templateFile = config.public.path + config.public.templates + "BT_Templates.xlsx";
        console.log("template file---> ", templateFile)
        let file = config.public.path + config.public.output + executionName + 'KPI_Report.xlsx';
        console.log("Kpi report ---> ", file)

        await workbook.xlsx.readFile(templateFile)
            .then(async function() {
                let worksheet = workbook.getWorksheet("Dual-HFP"); // get particular sheet
                let row_num = 5;
                let startRow = worksheet.getRow(row_num);

                for (let item of data) {
                    if (item['project_type'] == proj_type) {
                        let newRow = [''];
                        //console.log("item--", item["Uni-DirectionalTx-Rx Traffic(TP Values in Kbps)"]["E0"]["Master"]["Tx"]);
                        /* Static column values for TP KPI data */
                        newRow.push(item["DUT"], item["SoC Version"], item["SoC Type"], item["DUT FW"],
                            item["Interface"], item["DUT OS"], item["DUT Host Platform"], item["Audio path"], item["Link-1 HFP Interface"], item["Link-2 HFP Interface"],
                            item["DUT Controller Role wrt Codec(Master/Slave)"], item["Link-1 DUT BT Role(Master/Slave)"], item["Link-2 DUT BT Role(Master/Slave)"], item["Link-1 Packet Type"], item["Link-2 Packet Type"],
                            item["Link-1 Retransmission"], item["Link-2 Retransmission"], item["Link-1 Max Latency"], item["Link-1 Max Latency"], item["MOS Baseline"]);

                        if (typeof item["Link-1 MOS Score"] != 'undefined') {
                            if (typeof item["Link-1 MOS Score"]["Tx"] != 'undefined') {
                                newRow.push(item["Link-1 MOS Score"] ? item["Link-1 MOS Score"]["Tx"] : '');
                            } else { newRow.push(''); }
                            if (typeof item["Link-1 MOS Score"]["Rx"] != 'undefined') {
                                newRow.push(item["Link-1 MOS Score"] ? item["Link-1 MOS Score"]["Rx"] : '');

                            } else { newRow.push(''); }

                        } else { newRow.push('', ''); }

                        if (typeof item["Link-2 MOS Score"] != 'undefined') {
                            if (typeof item["Link-2 MOS Score"]["Tx"] != 'undefined') {
                                newRow.push(item["Link-2 MOS Score"] ? item["Link-2 MOS Score"]["Tx"] : '');
                            } else { newRow.push(''); }
                            if (typeof item["Link-2 MOS Score"]["Rx"] != 'undefined') {
                                newRow.push(item["Link-2 MOS Score"] ? item["Link-2 MOS Score"]["Rx"] : '');

                            } else { newRow.push(''); }

                        } else { newRow.push('', ''); }

                        startRow = worksheet.getRow(row_num);
                        for (let index = 0; index < newRow.length; index++) {
                            startRow.getCell(index + 1).value = newRow[index];
                        }
                        row_num += 1;
                    }
                }
                await workbook.xlsx.writeFile(file); // xlsx format generated from the above template
                console.log("file - ", file);
            });
        console.log("file return- ", file);
        return file;
    } catch (err) {
        logger.error("generateUnifiedReport : ", err);
    }
}

/*
    Creates a new xlsx excel workbook from the existing Unified BT template for given BLE_Throughput execution.
*/
async function generateBLE_ThroughputReport(data, executionName, proj_type) {

    try {
        console.log("execution name--->", executionName)
        const workbook = new ExcelJS.Workbook(); // creates a new workbook
        let templateFile = config.public.path + config.public.templates + "BT_Templates.xlsx";
        console.log("template file---> ", templateFile)
        let file = config.public.path + config.public.output + executionName + 'KPI_Report.xlsx';
        console.log("Kpi report ---> ", file)

        await workbook.xlsx.readFile(templateFile)
            .then(async function() {
                let worksheet = workbook.getWorksheet("BLE-THROUGHPUT"); // get particular sheet
                let row_num = 7;
                let startRow = worksheet.getRow(row_num);

                for (let item of data) {
                    if (item['project_type'] == proj_type) {
                        let newRow = [''];
                        /* Static column values for TP KPI data */
                        newRow.push(item["DUT"], item["Soc Version"], item["SocType"], item["DUT Fw"],
                            item["Interface"], item["DUT Os"], item["DUT Host Platform"], item["Connection_interval"], item["Theoretical Val (kbps)"], item["Baseline(95% of Theoretical val)(Kbps)"]);

                        /*------------- Le 1Mbps -----------------*/

                        if (typeof item["Le 1Mbps"] != 'undefined') {
                            /* Master */
                            if (typeof item["Le 1Mbps"]["Master"] != 'undefined') {
                                /* Uni-directional */
                                if (typeof item["Le 1Mbps"]["Master"]["uni-dir"] != 'undefined') {

                                    if (typeof item["Le 1Mbps"]["Master"]["uni-dir"]['TX'] != 'undefined') {

                                        newRow.push((item["Le 1Mbps"]["Master"]["uni-dir"] ? item["Le 1Mbps"]["Master"]["uni-dir"]['TX'] : ''));
                                    } else { newRow.push(''); }
                                    if (typeof item["Le 1Mbps"]["Master"]["uni-dir"]['RX'] != 'undefined') {

                                        newRow.push((item["Le 1Mbps"]["Master"]["uni-dir"] ? item["Le 1Mbps"]["Master"]["uni-dir"]['RX'] : ''));
                                    } else { newRow.push(''); }
                                } else { newRow.push('', ''); }
                                /* Bi-directional */
                                if (typeof item["Le 1Mbps"]["Master"]["bi-dir"] != 'undefined') {

                                    if (typeof item["Le 1Mbps"]["Master"]["bi-dir"]['TX'] != 'undefined') {

                                        newRow.push((item["Le 1Mbps"]["Master"]["bi-dir"] ? item["Le 1Mbps"]["Master"]["bi-dir"]['TX'] : ''));
                                    } else { newRow.push(''); }
                                    if (typeof item["Le 1Mbps"]["Master"]["bi-dir"]['RX'] != 'undefined') {

                                        newRow.push((item["Le 1Mbps"]["Master"]["bi-dir"] ? item["Le 1Mbps"]["Master"]["bi-dir"]['RX'] : ''));
                                    } else { newRow.push(''); }
                                } else { newRow.push('', ''); }
                            } else { newRow.push('', '', '', ''); }

                            /* slave */
                            if (typeof item["Le 1Mbps"]["Slave"] != 'undefined') {
                                /* Uni-directional */
                                if (typeof item["Le 1Mbps"]["Slave"]["uni-dir"] != 'undefined') {

                                    if (typeof item["Le 1Mbps"]["Slave"]["uni-dir"]['TX'] != 'undefined') {
                                        newRow.push((item["Le 1Mbps"]["Slave"]["uni-dir"] ? item["Le 1Mbps"]["Slave"]["uni-dir"]['TX'] : ''));
                                    } else { newRow.push(''); }

                                    if (typeof item["Le 1Mbps"]["Slave"]["uni-dir"]['RX'] != 'undefined') {
                                        newRow.push((item["Le 1Mbps"]["Slave"]["uni-dir"] ? item["Le 1Mbps"]["Slave"]["uni-dir"]['RX'] : ''));
                                    } else { newRow.push(''); }
                                } else { newRow.push('', ''); }

                                /* Bi-directional */
                                if (typeof item["Le 1Mbps"]["Slave"]["bi-dir"] != 'undefined') {

                                    if (typeof item["Le 1Mbps"]["Slave"]["bi-dir"]['TX'] != 'undefined') {
                                        newRow.push((item["Le 1Mbps"]["Slave"]["bi-dir"] ? item["Le 1Mbps"]["Slave"]["bi-dir"]['TX'] : ''));
                                    } else { newRow.push(''); }

                                    if (typeof item["Le 1Mbps"]["Slave"]["bi-dir"]['RX'] != 'undefined') {
                                        newRow.push((item["Le 1Mbps"]["Slave"]["bi-dir"] ? item["Le 1Mbps"]["Slave"]["bi-dir"]['RX'] : ''));
                                    } else { newRow.push(''); }

                                } else { newRow.push('', ''); }
                            } else { newRow.push('', '', '', ''); }
                        } else { newRow.push('', '', '', '', '', '', '', ''); }

                        newRow.push(item["Connection_interval"], item["Theoretical Val (kbps)"], item["Baseline(95% of Theoretical val)(Kbps)"]);

                        /*------------- Le 2Mbps -----------------*/

                        if (typeof item["Le 2Mbps"] != 'undefined') {
                            /* Master */
                            if (typeof item["Le 2Mbps"]["Master"] != 'undefined') {
                                /* Uni-directional */
                                if (typeof item["Le 2Mbps"]["Master"]["uni-dir"] != 'undefined') {

                                    if (typeof item["Le 2Mbps"]["Master"]["uni-dir"]['TX'] != 'undefined') {

                                        newRow.push((item["Le 2Mbps"]["Master"]["uni-dir"] ? item["Le 2Mbps"]["Master"]["uni-dir"]['TX'] : ''));
                                    } else { newRow.push(''); }
                                    if (typeof item["Le 2Mbps"]["Master"]["uni-dir"]['RX'] != 'undefined') {

                                        newRow.push((item["Le 2Mbps"]["Master"]["uni-dir"] ? item["Le 2Mbps"]["Master"]["uni-dir"]['RX'] : ''));
                                    } else { newRow.push(''); }
                                } else { newRow.push('', ''); }
                                /* Bi-directional */
                                if (typeof item["Le 2Mbps"]["Master"]["bi-dir"] != 'undefined') {

                                    if (typeof item["Le 2Mbps"]["Master"]["bi-dir"]['TX'] != 'undefined') {

                                        newRow.push((item["Le 2Mbps"]["Master"]["bi-dir"] ? item["Le 2Mbps"]["Master"]["bi-dir"]['TX'] : ''));
                                    } else { newRow.push(''); }
                                    if (typeof item["Le 2Mbps"]["Master"]["bi-dir"]['RX'] != 'undefined') {

                                        newRow.push((item["Le 2Mbps"]["Master"]["bi-dir"] ? item["Le 2Mbps"]["Master"]["bi-dir"]['RX'] : ''));
                                    } else { newRow.push(''); }
                                } else { newRow.push('', ''); }
                            } else { newRow.push('', '', '', ''); }

                            /* slave */
                            if (typeof item["Le 2Mbps"]["Slave"] != 'undefined') {
                                /* Uni-directional */
                                if (typeof item["Le 2Mbps"]["Slave"]["uni-dir"] != 'undefined') {

                                    if (typeof item["Le 2Mbps"]["Slave"]["uni-dir"]['TX'] != 'undefined') {
                                        newRow.push((item["Le 2Mbps"]["Slave"]["uni-dir"] ? item["Le 2Mbps"]["Slave"]["uni-dir"]['TX'] : ''));
                                    } else { newRow.push(''); }

                                    if (typeof item["Le 2Mbps"]["Slave"]["uni-dir"]['RX'] != 'undefined') {
                                        newRow.push((item["Le 2Mbps"]["Slave"]["uni-dir"] ? item["Le 2Mbps"]["Slave"]["uni-dir"]['RX'] : ''));
                                    } else { newRow.push(''); }
                                } else { newRow.push('', ''); }

                                /* Bi-directional */
                                if (typeof item["Le 2Mbps"]["Slave"]["bi-dir"] != 'undefined') {

                                    if (typeof item["Le 2Mbps"]["Slave"]["bi-dir"]['TX'] != 'undefined') {
                                        newRow.push((item["Le 2Mbps"]["Slave"]["bi-dir"] ? item["Le 2Mbps"]["Slave"]["bi-dir"]['TX'] : ''));
                                    } else { newRow.push(''); }

                                    if (typeof item["Le 2Mbps"]["Slave"]["bi-dir"]['RX'] != 'undefined') {
                                        newRow.push((item["Le 2Mbps"]["Slave"]["bi-dir"] ? item["Le 2Mbps"]["Slave"]["bi-dir"]['RX'] : ''));
                                    } else { newRow.push(''); }

                                } else { newRow.push('', ''); }
                            } else { newRow.push('', '', '', ''); }
                        } else { newRow.push('', '', '', '', '', '', '', ''); }


                        newRow.push(item["Connection_interval"], item["Theoretical Val (kbps)"], item["Baseline(95% of Theoretical val)(Kbps)"]);

                        /*------------- DLE 1Mbps -----------------*/

                        if (typeof item["DLE 1Mbps"] != 'undefined') {
                            /* Master */
                            if (typeof item["DLE 1Mbps"]["Master"] != 'undefined') {
                                /* Uni-directional */
                                if (typeof item["DLE 1Mbps"]["Master"]["uni-dir"] != 'undefined') {

                                    if (typeof item["DLE 1Mbps"]["Master"]["uni-dir"]['TX'] != 'undefined') {

                                        newRow.push((item["DLE 1Mbps"]["Master"]["uni-dir"] ? item["DLE 1Mbps"]["Master"]["uni-dir"]['TX'] : ''));
                                    } else { newRow.push(''); }
                                    if (typeof item["DLE 1Mbps"]["Master"]["uni-dir"]['RX'] != 'undefined') {

                                        newRow.push((item["DLE 1Mbps"]["Master"]["uni-dir"] ? item["DLE 1Mbps"]["Master"]["uni-dir"]['RX'] : ''));
                                    } else { newRow.push(''); }
                                } else { newRow.push('', ''); }
                                /* Bi-directional */
                                if (typeof item["DLE 1Mbps"]["Master"]["bi-dir"] != 'undefined') {

                                    if (typeof item["DLE 1Mbps"]["Master"]["bi-dir"]['TX'] != 'undefined') {

                                        newRow.push((item["DLE 1Mbps"]["Master"]["bi-dir"] ? item["DLE 1Mbps"]["Master"]["bi-dir"]['TX'] : ''));
                                    } else { newRow.push(''); }
                                    if (typeof item["DLE 1Mbps"]["Master"]["bi-dir"]['RX'] != 'undefined') {

                                        newRow.push((item["DLE 1Mbps"]["Master"]["bi-dir"] ? item["DLE 1Mbps"]["Master"]["bi-dir"]['RX'] : ''));
                                    } else { newRow.push(''); }
                                } else { newRow.push('', ''); }
                            } else { newRow.push('', '', '', ''); }

                            /* slave */
                            if (typeof item["DLE 1Mbps"]["Slave"] != 'undefined') {
                                /* Uni-directional */
                                if (typeof item["DLE 1Mbps"]["Slave"]["uni-dir"] != 'undefined') {

                                    if (typeof item["DLE 1Mbps"]["Slave"]["uni-dir"]['TX'] != 'undefined') {
                                        newRow.push((item["DLE 1Mbps"]["Slave"]["uni-dir"] ? item["DLE 1Mbps"]["Slave"]["uni-dir"]['TX'] : ''));
                                    } else { newRow.push(''); }

                                    if (typeof item["DLE 1Mbps"]["Slave"]["uni-dir"]['RX'] != 'undefined') {
                                        newRow.push((item["DLE 1Mbps"]["Slave"]["uni-dir"] ? item["DLE 1Mbps"]["Slave"]["uni-dir"]['RX'] : ''));
                                    } else { newRow.push(''); }
                                } else { newRow.push('', ''); }

                                /* Bi-directional */
                                if (typeof item["DLE 1Mbps"]["Slave"]["bi-dir"] != 'undefined') {

                                    if (typeof item["DLE 1Mbps"]["Slave"]["bi-dir"]['TX'] != 'undefined') {
                                        newRow.push((item["DLE 1Mbps"]["Slave"]["bi-dir"] ? item["DLE 1Mbps"]["Slave"]["bi-dir"]['TX'] : ''));
                                    } else { newRow.push(''); }

                                    if (typeof item["DLE 1Mbps"]["Slave"]["bi-dir"]['RX'] != 'undefined') {
                                        newRow.push((item["DLE 1Mbps"]["Slave"]["bi-dir"] ? item["DLE 1Mbps"]["Slave"]["bi-dir"]['RX'] : ''));
                                    } else { newRow.push(''); }

                                } else { newRow.push('', ''); }
                            } else { newRow.push('', '', '', ''); }
                        } else { newRow.push('', '', '', '', '', '', '', ''); }

                        newRow.push(item["Connection_interval"], item["Theoretical Val (kbps)"], item["Baseline(95% of Theoretical val)(Kbps)"]);


                        /*------------- DLE 2Mbps -----------------*/

                        if (typeof item["DLE 2Mbps"] != 'undefined') {
                            /* Master */
                            if (typeof item["DLE 2Mbps"]["Master"] != 'undefined') {
                                /* Uni-directional */
                                if (typeof item["DLE 2Mbps"]["Master"]["uni-dir"] != 'undefined') {

                                    if (typeof item["DLE 2Mbps"]["Master"]["uni-dir"]['TX'] != 'undefined') {

                                        newRow.push((item["DLE 2Mbps"]["Master"]["uni-dir"] ? item["DLE 2Mbps"]["Master"]["uni-dir"]['TX'] : ''));
                                    } else { newRow.push(''); }
                                    if (typeof item["DLE 2Mbps"]["Master"]["uni-dir"]['RX'] != 'undefined') {

                                        newRow.push((item["DLE 2Mbps"]["Master"]["uni-dir"] ? item["DLE 2Mbps"]["Master"]["uni-dir"]['RX'] : ''));
                                    } else { newRow.push(''); }
                                } else { newRow.push('', ''); }
                                /* Bi-directional */
                                if (typeof item["DLE 2Mbps"]["Master"]["bi-dir"] != 'undefined') {

                                    if (typeof item["DLE 2Mbps"]["Master"]["bi-dir"]['TX'] != 'undefined') {

                                        newRow.push((item["DLE 2Mbps"]["Master"]["bi-dir"] ? item["DLE 2Mbps"]["Master"]["bi-dir"]['TX'] : ''));
                                    } else { newRow.push(''); }
                                    if (typeof item["DLE 2Mbps"]["Master"]["bi-dir"]['RX'] != 'undefined') {

                                        newRow.push((item["DLE 2Mbps"]["Master"]["bi-dir"] ? item["DLE 2Mbps"]["Master"]["bi-dir"]['RX'] : ''));
                                    } else { newRow.push(''); }
                                } else { newRow.push('', ''); }
                            } else { newRow.push('', '', '', ''); }

                            /* slave */
                            if (typeof item["DLE 2Mbps"]["Slave"] != 'undefined') {
                                /* Uni-directional */
                                if (typeof item["DLE 2Mbps"]["Slave"]["uni-dir"] != 'undefined') {

                                    if (typeof item["DLE 2Mbps"]["Slave"]["uni-dir"]['TX'] != 'undefined') {
                                        newRow.push((item["DLE 2Mbps"]["Slave"]["uni-dir"] ? item["DLE 2Mbps"]["Slave"]["uni-dir"]['TX'] : ''));
                                    } else { newRow.push(''); }

                                    if (typeof item["DLE 2Mbps"]["Slave"]["uni-dir"]['RX'] != 'undefined') {
                                        newRow.push((item["DLE 2Mbps"]["Slave"]["uni-dir"] ? item["DLE 2Mbps"]["Slave"]["uni-dir"]['RX'] : ''));
                                    } else { newRow.push(''); }
                                } else { newRow.push('', ''); }

                                /* Bi-directional */
                                if (typeof item["DLE 2Mbps"]["Slave"]["bi-dir"] != 'undefined') {

                                    if (typeof item["DLE 2Mbps"]["Slave"]["bi-dir"]['TX'] != 'undefined') {
                                        newRow.push((item["DLE 2Mbps"]["Slave"]["bi-dir"] ? item["DLE 2Mbps"]["Slave"]["bi-dir"]['TX'] : ''));
                                    } else { newRow.push(''); }

                                    if (typeof item["DLE 2Mbps"]["Slave"]["bi-dir"]['RX'] != 'undefined') {
                                        newRow.push((item["DLE 2Mbps"]["Slave"]["bi-dir"] ? item["DLE 2Mbps"]["Slave"]["bi-dir"]['RX'] : ''));
                                    } else { newRow.push(''); }

                                } else { newRow.push('', ''); }
                            } else { newRow.push('', '', '', ''); }
                        } else { newRow.push('', '', '', '', '', '', '', ''); }


                        startRow = worksheet.getRow(row_num);
                        for (let index = 0; index < newRow.length; index++) {
                            startRow.getCell(index + 1).value = newRow[index];
                        }
                        row_num += 1;
                    }
                }
                await workbook.xlsx.writeFile(file); // xlsx format generated from the above template
                console.log("file - ", file);
            });
        console.log("file return- ", file);
        return file;
    } catch (err) {
        logger.error("generateUnifiedReport : ", err);
    }
}

/*
    Creates a new xlsx excel workbook from the existing COEX template for given Coex_Sets_Generic execution.
*/
async function generateCoex_Sets_GenericReport(data, executionName, proj_type) {
    try {
        console.log("execution name--->", executionName);
        console.log("proj_type  ---> ", proj_type);
        const workbook = new ExcelJS.Workbook(); // creates a new workbook'
        let templateFile = '';

        if (proj_type == 'COEX-BT-RVR') {
            templateFile = config.public.path + config.public.templates + "Coex_RVR_Set-1.xlsx";
        } else if (proj_type == 'COEX-WiFi-RVR') {
            templateFile = config.public.path + config.public.templates + "Coex_RVR_Set-2.xlsx";
        } else if (proj_type == 'COEX-BT-WiFi-RVR') {
            templateFile = config.public.path + config.public.templates + "Coex_RVR_Set-2.xlsx";
        }

        console.log("template file ---> ", templateFile);
        let file = config.public.path + config.public.output + executionName + '_KPI_Report.xlsx';
        console.log("Kpi report ---> ", file)

        await workbook.xlsx.readFile(templateFile)
            .then(async function() {
                var worksheet;
                if (proj_type == 'COEX-BT-RVR') {
                    worksheet = workbook.getWorksheet("Coex_RVR_Set-1"); // get particular sheet
                } else if (proj_type == 'COEX-WiFi-RVR') {
                    worksheet = workbook.getWorksheet("Coex_RVR_Set-2"); // get particular sheet
                } else if (proj_type == 'COEX-BT-WiFi-RVR') {
                    worksheet = workbook.getWorksheet("Coex_RvR_Set-3"); // get particular sheet
                }

                let row_num = 54;
                let startRow = worksheet.getRow(row_num);
                let dataArr = ["DataRSSI", "BeaconRSSI", "WiFiMCSRate", "WiFiNoisefloor", "BTRSSI", "WiFiCoexTP", "BTPerformanceResult#1", "BTPerformanceResult#2"];
                let i = 0;
                let slVal = 1;
                for (let item of data) {
                    let newRow = ['', '', slVal];
                    //console.log("item--", item["VHT-40MHz | 2GHz"]["Tcp_Tx"]["value"]);
                    /* Static column values for TP KPI data */
                    newRow.push(item["TP TYPE"], item["DUT"], item["SoC Version"], item["SoC TYPE"], item["DUT Fw/Drv"],
                        item["Interface"], item["Aggregation"], item["Spatial Streams"], item["Guard Interval"], item["Data Rate"],
                        item["Channel | 2 GHz"], item["Channel | 5 GHz"], item["SDIO Clock"], item["Companion Device/Ex-AP/Ex-STA/Ex-P2P-GO/Ex-P2P-GC"], item["Companion Device FW/Drv"],
                        item["DUT Host Platform"], item["DUT OS"], item["Security"], item["DUT Mode"],
                        item["BT Ref"], item["Coex mode"], item["ANT isolation"], item["BT profiles"], item["BT/BLE Role"],
                        item["Profile Param"], item["Connection param"], item["BT Sniff"], item["Test Duration"], item["Test Repetition"], item["DUT Protocol"]);


                    newRow.push('', dataArr[0], '');
                    // row1
                    newRow.push(
                        (item["30"] ? item["30"]["DataRSSI"] : ''),
                        (item["35"] ? item["35"]["DataRSSI"] : ''),
                        (item["40"] ? item["40"]["DataRSSI"] : ''),
                        (item["45"] ? item["45"]["DataRSSI"] : ''),
                        (item["50"] ? item["50"]["DataRSSI"] : ''),
                        (item["55"] ? item["55"]["DataRSSI"] : ''),
                        (item["60"] ? item["60"]["DataRSSI"] : ''),
                        (item["65"] ? item["65"]["DataRSSI"] : ''),
                        (item["70"] ? item["70"]["DataRSSI"] : ''),
                        (item["75"] ? item["75"]["DataRSSI"] : ''),
                        (item["80"] ? item["80"]["DataRSSI"] : ''),
                        (item["85"] ? item["85"]["DataRSSI"] : ''),
                        (item["90"] ? item["90"]["DataRSSI"] : ''),
                        (item["95"] ? item["95"]["DataRSSI"] : ''),
                        (item["100"] ? item["100"]["DataRSSI"] : ''),
                        (item["105"] ? item["105"]["DataRSSI"] : ''),
                        (item["110"] ? item["110"]["DataRSSI"] : ''));

                    startRow = worksheet.getRow(row_num);
                    for (let index = 0; index < newRow.length; index++) {
                        startRow.getCell(index + 1).value = newRow[index];
                    }
                    row_num += 1;

                    //row2
                    newRow = [];
                    newRow.push('', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', dataArr[1], '');
                    newRow.push(
                        (item["30"] ? item["30"]["BeaconRSSI"] : ''),
                        (item["35"] ? item["35"]["BeaconRSSI"] : ''),
                        (item["40"] ? item["40"]["BeaconRSSI"] : ''),
                        (item["45"] ? item["45"]["BeaconRSSI"] : ''),
                        (item["50"] ? item["50"]["BeaconRSSI"] : ''),
                        (item["55"] ? item["55"]["BeaconRSSI"] : ''),
                        (item["60"] ? item["60"]["BeaconRSSI"] : ''),
                        (item["65"] ? item["65"]["BeaconRSSI"] : ''),
                        (item["70"] ? item["70"]["BeaconRSSI"] : ''),
                        (item["75"] ? item["75"]["BeaconRSSI"] : ''),
                        (item["80"] ? item["80"]["BeaconRSSI"] : ''),
                        (item["85"] ? item["85"]["BeaconRSSI"] : ''),
                        (item["90"] ? item["90"]["BeaconRSSI"] : ''),
                        (item["95"] ? item["95"]["BeaconRSSI"] : ''),
                        (item["100"] ? item["100"]["BeaconRSSI"] : ''),
                        (item["105"] ? item["105"]["BeaconRSSI"] : ''),
                        (item["110"] ? item["110"]["BeaconRSSI"] : ''));
                    startRow = worksheet.getRow(row_num);
                    for (let index = 0; index < newRow.length; index++) {
                        startRow.getCell(index + 1).value = newRow[index];
                    }
                    row_num += 1;

                    //row3
                    newRow = [];
                    newRow.push('', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', dataArr[2], '');
                    newRow.push(
                        (item["30"] ? item["30"]["WiFiMCSRate"] : ''),
                        (item["35"] ? item["35"]["WiFiMCSRate"] : ''),
                        (item["40"] ? item["40"]["WiFiMCSRate"] : ''),
                        (item["45"] ? item["45"]["WiFiMCSRate"] : ''),
                        (item["50"] ? item["50"]["WiFiMCSRate"] : ''),
                        (item["55"] ? item["55"]["WiFiMCSRate"] : ''),
                        (item["60"] ? item["60"]["WiFiMCSRate"] : ''),
                        (item["65"] ? item["65"]["WiFiMCSRate"] : ''),
                        (item["70"] ? item["70"]["WiFiMCSRate"] : ''),
                        (item["75"] ? item["75"]["WiFiMCSRate"] : ''),
                        (item["80"] ? item["80"]["WiFiMCSRate"] : ''),
                        (item["85"] ? item["85"]["WiFiMCSRate"] : ''),
                        (item["90"] ? item["90"]["WiFiMCSRate"] : ''),
                        (item["95"] ? item["95"]["WiFiMCSRate"] : ''),
                        (item["100"] ? item["100"]["WiFiMCSRate"] : ''),
                        (item["105"] ? item["105"]["WiFiMCSRate"] : ''),
                        (item["110"] ? item["110"]["WiFiMCSRate"] : ''));
                    startRow = worksheet.getRow(row_num);
                    for (let index = 0; index < newRow.length; index++) {
                        startRow.getCell(index + 1).value = newRow[index];
                    }
                    row_num += 1;

                    //row4
                    newRow = [];
                    newRow.push('', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', dataArr[3], '');
                    newRow.push((item["30"] ? item["30"]["WiFiNoisefloor"] : ''),
                        (item["35"] ? item["35"]["WiFiNoisefloor"] : ''),
                        (item["40"] ? item["40"]["WiFiNoisefloor"] : ''),
                        (item["45"] ? item["45"]["WiFiNoisefloor"] : ''),
                        (item["50"] ? item["50"]["WiFiNoisefloor"] : ''),
                        (item["55"] ? item["55"]["WiFiNoisefloor"] : ''),
                        (item["60"] ? item["60"]["WiFiNoisefloor"] : ''),
                        (item["65"] ? item["65"]["WiFiNoisefloor"] : ''),
                        (item["70"] ? item["70"]["WiFiNoisefloor"] : ''),
                        (item["75"] ? item["75"]["WiFiNoisefloor"] : ''),
                        (item["80"] ? item["80"]["WiFiNoisefloor"] : ''),
                        (item["85"] ? item["85"]["WiFiNoisefloor"] : ''),
                        (item["90"] ? item["90"]["WiFiNoisefloor"] : ''),
                        (item["95"] ? item["95"]["WiFiNoisefloor"] : ''),
                        (item["100"] ? item["100"]["WiFiNoisefloor"] : ''),
                        (item["105"] ? item["105"]["WiFiNoisefloor"] : ''),
                        (item["110"] ? item["110"]["WiFiNoisefloor"] : ''));
                    startRow = worksheet.getRow(row_num);
                    for (let index = 0; index < newRow.length; index++) {
                        startRow.getCell(index + 1).value = newRow[index];
                    }
                    row_num += 1;

                    //row5
                    newRow = [];
                    newRow.push('', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', dataArr[4], '');

                    newRow.push((item["30"] ? item["30"]["BTRSSI"] : ''),
                        (item["35"] ? item["35"]["BTRSSI"] : ''),
                        (item["40"] ? item["40"]["BTRSSI"] : ''),
                        (item["45"] ? item["45"]["BTRSSI"] : ''),
                        (item["50"] ? item["50"]["BTRSSI"] : ''),
                        (item["55"] ? item["55"]["BTRSSI"] : ''),
                        (item["60"] ? item["60"]["BTRSSI"] : ''),
                        (item["65"] ? item["65"]["BTRSSI"] : ''),
                        (item["70"] ? item["70"]["BTRSSI"] : ''),
                        (item["75"] ? item["75"]["BTRSSI"] : ''),
                        (item["80"] ? item["80"]["BTRSSI"] : ''),
                        (item["85"] ? item["85"]["BTRSSI"] : ''),
                        (item["90"] ? item["90"]["BTRSSI"] : ''),
                        (item["95"] ? item["95"]["BTRSSI"] : ''),
                        (item["100"] ? item["100"]["BTRSSI"] : ''),
                        (item["105"] ? item["105"]["BTRSSI"] : ''),
                        (item["110"] ? item["110"]["BTRSSI"] : ''));
                    startRow = worksheet.getRow(row_num);
                    for (let index = 0; index < newRow.length; index++) {
                        startRow.getCell(index + 1).value = newRow[index];
                    }
                    row_num += 1;

                    //row6
                    newRow = [];
                    newRow.push('', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', dataArr[5], '');

                    newRow.push((item["30"] ? item["30"]["WiFiCoexTP"] : ''),
                        (item["35"] ? item["35"]["WiFiCoexTP"] : ''),
                        (item["40"] ? item["40"]["WiFiCoexTP"] : ''),
                        (item["45"] ? item["45"]["WiFiCoexTP"] : ''),
                        (item["50"] ? item["50"]["WiFiCoexTP"] : ''),
                        (item["55"] ? item["55"]["WiFiCoexTP"] : ''),
                        (item["60"] ? item["60"]["WiFiCoexTP"] : ''),
                        (item["65"] ? item["65"]["WiFiCoexTP"] : ''),
                        (item["70"] ? item["70"]["WiFiCoexTP"] : ''),
                        (item["75"] ? item["75"]["WiFiCoexTP"] : ''),
                        (item["80"] ? item["80"]["WiFiCoexTP"] : ''),
                        (item["85"] ? item["85"]["WiFiCoexTP"] : ''),
                        (item["90"] ? item["90"]["WiFiCoexTP"] : ''),
                        (item["95"] ? item["95"]["WiFiCoexTP"] : ''),
                        (item["100"] ? item["100"]["WiFiCoexTP"] : ''),
                        (item["105"] ? item["105"]["WiFiCoexTP"] : ''),
                        (item["110"] ? item["110"]["WiFiCoexTP"] : ''));

                    startRow = worksheet.getRow(row_num);
                    for (let index = 0; index < newRow.length; index++) {
                        startRow.getCell(index + 1).value = newRow[index];
                    }
                    row_num += 1;

                    //row7
                    newRow = [];
                    newRow.push('', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', dataArr[6], '');

                    newRow.push((item["30"] ? item["30"]["BTPerformanceResult#1"] : ''),
                        (item["35"] ? item["35"]["BTPerformanceResult#1"] : ''),
                        (item["40"] ? item["40"]["BTPerformanceResult#1"] : ''),
                        (item["45"] ? item["45"]["BTPerformanceResult#1"] : ''),
                        (item["50"] ? item["50"]["BTPerformanceResult#1"] : ''),
                        (item["55"] ? item["55"]["BTPerformanceResult#1"] : ''),
                        (item["60"] ? item["60"]["BTPerformanceResult#1"] : ''),
                        (item["65"] ? item["65"]["BTPerformanceResult#1"] : ''),
                        (item["70"] ? item["70"]["BTPerformanceResult#1"] : ''),
                        (item["75"] ? item["75"]["BTPerformanceResult#1"] : ''),
                        (item["80"] ? item["80"]["BTPerformanceResult#1"] : ''),
                        (item["85"] ? item["85"]["BTPerformanceResult#1"] : ''),
                        (item["90"] ? item["90"]["BTPerformanceResult#1"] : ''),
                        (item["95"] ? item["95"]["BTPerformanceResult#1"] : ''),
                        (item["100"] ? item["100"]["BTPerformanceResult#1"] : ''),
                        (item["105"] ? item["105"]["BTPerformanceResult#1"] : ''),
                        (item["110"] ? item["110"]["BTPerformanceResult#1"] : ''));

                    startRow = worksheet.getRow(row_num);
                    for (let index = 0; index < newRow.length; index++) {
                        startRow.getCell(index + 1).value = newRow[index];
                    }
                    row_num += 1;

                    //row8
                    newRow = [];
                    newRow.push('', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', dataArr[7], '');

                    newRow.push((item["30"] ? item["30"]["BTPerformanceResult#2"] : ''),
                        (item["35"] ? item["35"]["BTPerformanceResult#2"] : ''),
                        (item["40"] ? item["40"]["BTPerformanceResult#2"] : ''),
                        (item["45"] ? item["45"]["BTPerformanceResult#2"] : ''),
                        (item["50"] ? item["50"]["BTPerformanceResult#2"] : ''),
                        (item["55"] ? item["55"]["BTPerformanceResult#2"] : ''),
                        (item["60"] ? item["60"]["BTPerformanceResult#2"] : ''),
                        (item["65"] ? item["65"]["BTPerformanceResult#2"] : ''),
                        (item["70"] ? item["70"]["BTPerformanceResult#2"] : ''),
                        (item["75"] ? item["75"]["BTPerformanceResult#2"] : ''),
                        (item["80"] ? item["80"]["BTPerformanceResult#2"] : ''),
                        (item["85"] ? item["85"]["BTPerformanceResult#2"] : ''),
                        (item["90"] ? item["90"]["BTPerformanceResult#2"] : ''),
                        (item["95"] ? item["95"]["BTPerformanceResult#2"] : ''),
                        (item["100"] ? item["100"]["BTPerformanceResult#2"] : ''),
                        (item["105"] ? item["105"]["BTPerformanceResult#2"] : ''),
                        (item["110"] ? item["110"]["BTPerformanceResult#2"] : ''));

                    startRow = worksheet.getRow(row_num);
                    for (let index = 0; index < newRow.length; index++) {
                        startRow.getCell(index + 1).value = newRow[index];
                    }
                    row_num += 1;
                    slVal += 1;
                }
                await workbook.xlsx.writeFile(file); // xlsx format generated from the above template
                console.log("file - ", file);
            });
        console.log("file return- ", file);
        return file;
    } catch (err) {
        logger.error("generateUnifiedReport : ", err);
    }
}

/*
    Creates a new xlsx excel workbook from the existing Unified KPI template for given TP execution.
*/
async function generateBT_RvRReport(data, executionName, proj_type) {

    try {
        console.log("execution name--->", executionName)
        const workbook = new ExcelJS.Workbook(); // creates a new workbook
        let templateFile = config.public.path + config.public.templates + "BT_Templates.xlsx";
        console.log("template file---> ", templateFile)
        let file = config.public.path + config.public.output + executionName + 'KPI_Report.xlsx';
        console.log("Kpi report ---> ", file)

        await workbook.xlsx.readFile(templateFile)
            .then(async function() {
                let worksheet = workbook.getWorksheet("BT-RvR"); // get particular sheet
                //console.log("worksheet---->", worksheet);
                let row_num = 7;
                let startRow = worksheet.getRow(row_num);
                var count = 1;

                let tracker = 0;
                for (let item of data) {
                    if (item['project_type'] == proj_type) {
                        tracker++;
                        let newRow = [''];
                        /* Static column values for TP KPI data */
                        newRow.push(item["Test scenario"], item["DUT"], item["SoC Version"], item["SoC Type"], item["DUT FW"],
                            item["Interface"], item["DUT OS"], item["DUT Host Platform"], item["DUT (Master/Slave)"], item["DUT (Tx/Rx)"]);

                        newRow.push(item["BLE Attn "]);
                        newRow.push((item["20"] ? item["20"]["Rssi"] : ''), (item["41"] ? item["41"]["Rssi"] : ''), (item["51"] ? item["51"]["Rssi"] : ''), (item["56"] ? item["56"]["Rssi"] : ''), (item["61"] ? item["61"]["Rssi"] : ''));
                        newRow.push((item["66"] ? item["66"]["Rssi"] : ''), (item["71"] ? item["71"]["Rssi"] : ''), (item["72"] ? item["72"]["Rssi"] : ''), (item["73"] ? item["73"]["Rssi"] : ''), (item["74"] ? item["74"]["Rssi"] : ''), (item["75"] ? item["75"]["Rssi"] : ''), (item["76"] ? item["76"]["Rssi"] : ''), (item["77"] ? item["77"]["Rssi"] : ''));
                        newRow.push((item["78"] ? item["78"]["Rssi"] : ''), (item["79"] ? item["79"]["Rssi"] : ''), (item["80"] ? item["80"]["Rssi"] : ''), (item["81"] ? item["81"]["Rssi"] : ''), (item["82"] ? item["82"]["Rssi"] : ''), (item["83"] ? item["83"]["Rssi"] : ''), (item["84"] ? item["84"]["Rssi"] : ''), (item["85"] ? item["85"]["Rssi"] : ''));
                        newRow.push((item["86"] ? item["86"]["Rssi"] : ''), (item["87"] ? item["87"]["Rssi"] : ''), (item["88"] ? item["88"]["Rssi"] : ''), (item["89"] ? item["89"]["Rssi"] : ''), (item["90"] ? item["90"]["Rssi"] : ''), (item["91"] ? item["91"]["Rssi"] : ''), (item["92"] ? item["92"]["Rssi"] : ''), (item["93"] ? item["93"]["Rssi"] : ''));
                        newRow.push((item["94"] ? item["94"]["Rssi"] : ''), (item["95"] ? item["95"]["Rssi"] : ''), (item["96"] ? item["96"]["Rssi"] : ''), (item["97"] ? item["97"]["Rssi"] : ''), (item["98"] ? item["98"]["Rssi"] : ''), (item["99"] ? item["99"]["Rssi"] : ''), (item["100"] ? item["100"]["Rssi"] : ''), (item["101"] ? item["101"]["Rssi"] : ''));
                        newRow.push((item["102"] ? item["102"]["Rssi"] : ''), (item["103"] ? item["103"]["Rssi"] : ''), (item["104"] ? item["104"]["Rssi"] : ''), (item["105"] ? item["105"]["Rssi"] : ''), (item["106"] ? item["106"]["Rssi"] : ''), (item["107"] ? item["107"]["Rssi"] : ''), (item["108"] ? item["108"]["Rssi"] : ''), (item["109"] ? item["109"]["Rssi"] : ''), (item["110"] ? item["110"]["Rssi"] : ''), (item["111"] ? item["111"]["Rssi"] : ''));

                        startRow = worksheet.getRow(row_num);
                        for (let index = 0; index < newRow.length; index++) {
                            startRow.getCell(index + 1).value = newRow[index];
                        }
                        row_num += 1;

                        newRow = ['', '', '', '', '', '', '', '', '', '', '', ''];
                        //newRow.push(item["BLE Attn "][1])
                        newRow.push((item["20"] ? item["20"]["Throughput"] : ''), (item["41"] ? item["41"]["Throughput"] : ''), (item["51"] ? item["51"]["Throughput"] : ''), (item["56"] ? item["56"]["Throughput"] : ''), (item["61"] ? item["61"]["Throughput"] : ''));
                        newRow.push((item["66"] ? item["66"]["Throughput"] : ''), (item["71"] ? item["71"]["Throughput"] : ''), (item["72"] ? item["72"]["Throughput"] : ''), (item["73"] ? item["73"]["Throughput"] : ''), (item["74"] ? item["74"]["Throughput"] : ''), (item["75"] ? item["75"]["Throughput"] : ''), (item["76"] ? item["76"]["Throughput"] : ''), (item["77"] ? item["77"]["Throughput"] : ''));
                        newRow.push((item["78"] ? item["78"]["Throughput"] : ''), (item["79"] ? item["79"]["Throughput"] : ''), (item["80"] ? item["80"]["Throughput"] : ''), (item["81"] ? item["81"]["Throughput"] : ''), (item["82"] ? item["82"]["Throughput"] : ''), (item["83"] ? item["83"]["Throughput"] : ''), (item["84"] ? item["84"]["Throughput"] : ''), (item["85"] ? item["85"]["Throughput"] : ''));
                        newRow.push((item["86"] ? item["86"]["Throughput"] : ''), (item["87"] ? item["87"]["Throughput"] : ''), (item["88"] ? item["88"]["Throughput"] : ''), (item["89"] ? item["89"]["Throughput"] : ''), (item["90"] ? item["90"]["Throughput"] : ''), (item["91"] ? item["91"]["Throughput"] : ''), (item["92"] ? item["92"]["Throughput"] : ''), (item["93"] ? item["93"]["Throughput"] : ''));
                        newRow.push((item["94"] ? item["94"]["Throughput"] : ''), (item["95"] ? item["95"]["Throughput"] : ''), (item["96"] ? item["96"]["Throughput"] : ''), (item["97"] ? item["97"]["Throughput"] : ''), (item["98"] ? item["98"]["Throughput"] : ''), (item["99"] ? item["99"]["Throughput"] : ''), (item["100"] ? item["100"]["Throughput"] : ''), (item["101"] ? item["101"]["Throughput"] : ''));
                        newRow.push((item["102"] ? item["102"]["Throughput"] : ''), (item["103"] ? item["103"]["Throughput"] : ''), (item["104"] ? item["104"]["Throughput"] : ''), (item["105"] ? item["105"]["Throughput"] : ''), (item["106"] ? item["106"]["Throughput"] : ''), (item["107"] ? item["107"]["Throughput"] : ''), (item["108"] ? item["108"]["Throughput"] : ''), (item["109"] ? item["109"]["Throughput"] : ''), (item["110"] ? item["110"]["Throughput"] : ''), (item["111"] ? item["111"]["ThroughpuRssit"] : ''));

                        startRow = worksheet.getRow(row_num);
                        for (let index = 0; index < newRow.length; index++) {
                            startRow.getCell(index + 1).value = newRow[index];
                        }
                        row_num += 1;
                        if (tracker == 12) {
                            tracker = 0;
                            row_num += 20;
                        }

                    }
                }
                await workbook.xlsx.writeFile(file); // xlsx format generated from the above template
                console.log("file - ", file);
            });
        console.log("file return- ", file);
        return file;
    } catch (err) {
        logger.error("generateUnifiedReport : ", err);
    }
}

/*
    Creates a new xlsx excel workbook from the existing Unified BT for given LE_Long_Range_RvR execution.
*/
async function generateLE_Long_Range_RvRReport(data, executionName, proj_type) {

    try {
        console.log("execution name--->", executionName)
        const workbook = new ExcelJS.Workbook(); // creates a new workbook
        let templateFile = config.public.path + config.public.templates + "BT_Templates.xlsx";
        console.log("template file---> ", templateFile)
        let file = config.public.path + config.public.output + executionName + 'KPI_Report.xlsx';
        console.log("Kpi report ---> ", file)

        await workbook.xlsx.readFile(templateFile)
            .then(async function() {
                let worksheet = workbook.getWorksheet("LE-Long-Range-RvR"); // get particular sheet
                let row_num = 7;
                let startRow = worksheet.getRow(row_num);

                let tracker = 0;
                for (let item of data) {
                    if (item['project_type'] == proj_type) {
                        tracker++;

                        let newRow = [''];

                        /* Static column values for TP KPI data */
                        newRow.push(item["DUT"], item["SoC Version"], item["SoC Type"], item["DUT FW"],
                            item["Interface"], item["DUT OS"], item["DUT Host Platform"], item["DUT (Master/Slave)(Tx/Rx)"], item["REF (Master/Slave)(Tx/Rx)"],
                            item["Connection Interval"], item["BLE PHY 1M/2M/DLE"], item["Test scenario"]);

                        newRow.push(item["BLE Attn "][0])
                        newRow.push((item["29"] ? item["29"]["Rssi"] : ''), (item["50"] ? item["50"]["Rssi"] : ''), (item["60"] ? item["60"]["Rssi"] : ''), (item["65"] ? item["65"]["Rssi"] : ''), (item["70"] ? item["70"]["Rssi"] : ''));
                        newRow.push((item["72"] ? item["72"]["Rssi"] : ''), (item["74"] ? item["74"]["Rssi"] : ''), (item["76"] ? item["76"]["Rssi"] : ''), (item["77"] ? item["77"]["Rssi"] : ''), (item["78"] ? item["78"]["Rssi"] : ''), (item["79"] ? item["79"]["Rssi"] : ''), (item["80"] ? item["80"]["Rssi"] : ''), (item["81"] ? item["81"]["Rssi"] : ''));
                        newRow.push((item["82"] ? item["82"]["Rssi"] : ''), (item["83"] ? item["83"]["Rssi"] : ''), (item["84"] ? item["84"]["Rssi"] : ''), (item["85"] ? item["85"]["Rssi"] : ''), (item["86"] ? item["86"]["Rssi"] : ''), (item["87"] ? item["87"]["Rssi"] : ''), (item["88"] ? item["88"]["Rssi"] : ''), (item["89"] ? item["89"]["Rssi"] : ''));
                        newRow.push((item["90"] ? item["90"]["Rssi"] : ''), (item["91"] ? item["91"]["Rssi"] : ''), (item["92"] ? item["92"]["Rssi"] : ''), (item["93"] ? item["93"]["Rssi"] : ''), (item["94"] ? item["94"]["Rssi"] : ''), (item["95"] ? item["95"]["Rssi"] : ''), (item["96"] ? item["96"]["Rssi"] : ''), (item["97"] ? item["97"]["Rssi"] : ''));
                        newRow.push((item["98"] ? item["98"]["Rssi"] : ''), (item["99"] ? item["99"]["Rssi"] : ''), (item["100"] ? item["100"]["Rssi"] : ''), (item["101"] ? item["101"]["Rssi"] : ''), (item["102"] ? item["102"]["Rssi"] : ''), (item["103"] ? item["103"]["Rssi"] : ''), (item["104"] ? item["104"]["Rssi"] : ''), (item["105"] ? item["105"]["Rssi"] : ''));
                        newRow.push((item["106"] ? item["106"]["Rssi"] : ''), (item["107"] ? item["107"]["Rssi"] : ''), (item["108"] ? item["108"]["Rssi"] : ''), (item["109"] ? item["109"]["Rssi"] : ''), (item["110"] ? item["110"]["Rssi"] : ''), (item["111"] ? item["111"]["Rssi"] : ''), (item["112"] ? item["112"]["Rssi"] : ''), (item["113"] ? item["113"]["Rssi"] : ''), (item["114"] ? item["114"]["Rssi"] : ''), (item["115"] ? item["115"]["Rssi"] : ''));
                        newRow.push((item["116"] ? item["116"]["Rssi"] : ''), (item["117"] ? item["117"]["Rssi"] : ''), (item["118"] ? item["118"]["Rssi"] : ''), (item["119"] ? item["119"]["Rssi"] : ''), (item["120"] ? item["120"]["Rssi"] : ''));
                        startRow = worksheet.getRow(row_num);
                        for (let index = 0; index < newRow.length; index++) {
                            startRow.getCell(index + 1).value = newRow[index];
                        }
                        row_num += 1;
                        if (item["Test scenario"] == 'LE_Coded_Legacy : UUT-RX(SLAVE) To REF-TX' || item["Test scenario"] == 'LE_Coded_Legacy : UUT-TX(MASTER) To REF-RX' || item["Test scenario"] == 'LE_Coded_Legacy : UUT-TX(SLAVE) To REF-RX')
                            row_num += 13;



                        newRow = [''];
                        newRow.push('', '', '', '', '', '', '', '', '', '', '', '');
                        newRow.push(item["BLE Attn "][1])
                        newRow.push((item["29"] ? item["29"]["Throughput"] : ''), (item["50"] ? item["50"]["Throughput"] : ''), (item["60"] ? item["60"]["Throughput"] : ''), (item["65"] ? item["65"]["Throughput"] : ''), (item["70"] ? item["70"]["Throughput"] : ''));
                        newRow.push((item["72"] ? item["72"]["Throughput"] : ''), (item["74"] ? item["74"]["Throughput"] : ''), (item["76"] ? item["76"]["Throughput"] : ''), (item["77"] ? item["77"]["Throughput"] : ''), (item["78"] ? item["78"]["Throughput"] : ''), (item["79"] ? item["79"]["Throughput"] : ''), (item["80"] ? item["80"]["Throughput"] : ''), (item["81"] ? item["81"]["Throughput"] : ''));
                        newRow.push((item["82"] ? item["82"]["Throughput"] : ''), (item["83"] ? item["83"]["Throughput"] : ''), (item["84"] ? item["84"]["Throughput"] : ''), (item["85"] ? item["85"]["Throughput"] : ''), (item["86"] ? item["86"]["Throughput"] : ''), (item["87"] ? item["87"]["Throughput"] : ''), (item["88"] ? item["88"]["Throughput"] : ''), (item["89"] ? item["89"]["Throughput"] : ''));
                        newRow.push((item["90"] ? item["90"]["Throughput"] : ''), (item["91"] ? item["91"]["Throughput"] : ''), (item["92"] ? item["92"]["Throughput"] : ''), (item["93"] ? item["93"]["Throughput"] : ''), (item["94"] ? item["94"]["Throughput"] : ''), (item["95"] ? item["95"]["Throughput"] : ''), (item["96"] ? item["96"]["Throughput"] : ''), (item["97"] ? item["97"]["Throughput"] : ''));
                        newRow.push((item["98"] ? item["98"]["Throughput"] : ''), (item["99"] ? item["99"]["Throughput"] : ''), (item["100"] ? item["100"]["Throughput"] : ''), (item["101"] ? item["101"]["Throughput"] : ''), (item["102"] ? item["102"]["Throughput"] : ''), (item["103"] ? item["103"]["Throughput"] : ''), (item["104"] ? item["104"]["Throughput"] : ''), (item["105"] ? item["105"]["Throughput"] : ''));
                        newRow.push((item["106"] ? item["106"]["Throughput"] : ''), (item["107"] ? item["107"]["Throughput"] : ''), (item["108"] ? item["108"]["Throughput"] : ''), (item["109"] ? item["109"]["Throughput"] : ''), (item["110"] ? item["110"]["Throughput"] : ''), (item["111"] ? item["111"]["Rssi"] : ''), (item["112"] ? item["112"]["Rssi"] : ''), (item["113"] ? item["113"]["Rssi"] : ''), (item["114"] ? item["114"]["Rssi"] : ''), (item["115"] ? item["115"]["Rssi"] : ''));
                        newRow.push((item["116"] ? item["116"]["Throughput"] : ''), (item["117"] ? item["117"]["Throughput"] : ''), (item["118"] ? item["118"]["Throughput"] : ''), (item["119"] ? item["119"]["Throughput"] : ''), (item["120"] ? item["120"]["Throughput"] : ''));

                        startRow = worksheet.getRow(row_num);

                        for (let index = 0; index < newRow.length; index++) {
                            startRow.getCell(index + 1).value = newRow[index];
                        }
                        row_num += 1
                        if (tracker == 8) {
                            tracker = 0;
                            row_num += 20;
                        }

                    }
                }
                await workbook.xlsx.writeFile(file); // xlsx format generated from the above template
                console.log("file - ", file);
            });
        console.log("file return- ", file);
        return file;
    } catch (err) {
        logger.error("generateUnifiedReport : ", err);
    }
}

/*
    Creates a new xlsx excel workbook from the existing Unified BT for given BLE_RvR execution.
*/
async function generateBLE_RvRReport(data, executionName, proj_type) {

    try {
        console.log("execution name--->", executionName)
        const workbook = new ExcelJS.Workbook(); // creates a new workbook
        let templateFile = config.public.path + config.public.templates + "BT_Templates.xlsx";
        console.log("template file---> ", templateFile)
        let file = config.public.path + config.public.output + executionName + 'KPI_Report.xlsx';
        console.log("Kpi report ---> ", file)

        await workbook.xlsx.readFile(templateFile)
            .then(async function() {
                let worksheet = workbook.getWorksheet("BLE-RvR"); // get particular sheet
                let row_num = 7;
                let startRow = worksheet.getRow(row_num);
                var count = 1;

                let tracker = 0;
                for (let item of data) {
                    if (item['project_type'] == proj_type) {
                        tracker++;
                        let newRow = [''];
                        /* Static column values for TP KPI data */
                        newRow.push(item["DUT"], item["SoC Version"], item["SoC Type"], item["DUT FW"],
                            item["Interface"], item["DUT OS"], item["DUT Host Platform"], item["DUT (Master/Slave)(Tx/Rx)"], item["REF (Master/Slave)(Tx/Rx)"],
                            item["Connection Interval"], item["BLE PHY 1M/2M/DLE"], item["Test scenario"]);

                        newRow.push(item["BLE Attn "][0])
                        newRow.push((item["20"] ? item["20"]["Rssi"] : ''), (item["41"] ? item["41"]["Rssi"] : ''), (item["51"] ? item["51"]["Rssi"] : ''), (item["56"] ? item["56"]["Rssi"] : ''), (item["61"] ? item["61"]["Rssi"] : ''));
                        newRow.push((item["66"] ? item["66"]["Rssi"] : ''), (item["71"] ? item["71"]["Rssi"] : ''), (item["72"] ? item["72"]["Rssi"] : ''), (item["73"] ? item["73"]["Rssi"] : ''), (item["74"] ? item["74"]["Rssi"] : ''), (item["75"] ? item["75"]["Rssi"] : ''), (item["76"] ? item["76"]["Rssi"] : ''), (item["77"] ? item["77"]["Rssi"] : ''));
                        newRow.push((item["78"] ? item["78"]["Rssi"] : ''), (item["79"] ? item["79"]["Rssi"] : ''), (item["80"] ? item["80"]["Rssi"] : ''), (item["81"] ? item["81"]["Rssi"] : ''), (item["82"] ? item["82"]["Rssi"] : ''), (item["83"] ? item["83"]["Rssi"] : ''), (item["84"] ? item["84"]["Rssi"] : ''), (item["85"] ? item["85"]["Rssi"] : ''));
                        newRow.push((item["86"] ? item["86"]["Rssi"] : ''), (item["87"] ? item["87"]["Rssi"] : ''), (item["88"] ? item["88"]["Rssi"] : ''), (item["89"] ? item["89"]["Rssi"] : ''), (item["90"] ? item["90"]["Rssi"] : ''), (item["91"] ? item["91"]["Rssi"] : ''), (item["92"] ? item["92"]["Rssi"] : ''), (item["93"] ? item["94"]["Rssi"] : ''));
                        newRow.push((item["94"] ? item["94"]["Rssi"] : ''), (item["95"] ? item["95"]["Rssi"] : ''), (item["96"] ? item["96"]["Rssi"] : ''), (item["97"] ? item["97"]["Rssi"] : ''), (item["98"] ? item["98"]["Rssi"] : ''), (item["99"] ? item["99"]["Rssi"] : ''), (item["100"] ? item["100"]["Rssi"] : ''), (item["101"] ? item["101"]["Rssi"] : ''));
                        newRow.push((item["102"] ? item["102"]["Rssi"] : ''), (item["103"] ? item["103"]["Rssi"] : ''), (item["104"] ? item["104"]["Rssi"] : ''), (item["105"] ? item["105"]["Rssi"] : ''), (item["106"] ? item["106"]["Rssi"] : ''), (item["107"] ? item["107"]["Rssi"] : ''), (item["108"] ? item["108"]["Rssi"] : ''), (item["109"] ? item["109"]["Rssi"] : ''), (item["110"] ? item["110"]["Rssi"] : ''), (item["111"] ? item["111"]["Rssi"] : ''));
                        newRow.push((item["112"] ? item["112"]["Rssi"] : ''), (item["113"] ? item["113"]["Rssi"] : ''), (item["114"] ? item["114"]["Rssi"] : ''), (item["115"] ? item["115"]["Rssi"] : ''), (item["116"] ? item["116"]["Rssi"] : ''));
                        startRow = worksheet.getRow(row_num);
                        for (let index = 0; index < newRow.length; index++) {
                            startRow.getCell(index + 1).value = newRow[index];
                        }
                        row_num += 1;
                        if (item["Test scenario"] == 'DLE : UUT-RX(MASTER) To REF-TX') {
                            row_num += 13;
                        }

                        if (item["Test scenario"] == '2Mbps : UUT-RX(MASTER) To REF-TX' || item["Test scenario"] == '1Mbps : UUT-RX(SLAVE) To REF-TX' || item["Test scenario"] == '2Mbps : UUT-RX(SLAVE) To REF-TX' || item["Test scenario"] == 'DLE : UUT-RX(SLAVE) To REF-TX' || item["Test scenario"] == '1Mbps : UUT-TX(MASTER) To REF-RX' || item["Test scenario"] == '2Mbps : UUT-TX(MASTER) To REF-RX' || item["Test scenario"] == 'DLE : UUT-TX(MASTER) To REF-RX' || item["Test scenario"] == '1Mbps : UUT-TX(SLAVE) To REF-RX' || item["Test scenario"] == '2Mbps : UUT-TX(SLAVE) To REF-RX' || item["Test scenario"] == 'DLE : UUT-TX(SLAVE) To REF-RX') {
                            row_num += 5;

                        }

                        newRow = [''];
                        newRow.push('', '', '', '', '', '', '', '', '', '', '', '');
                        newRow.push(item["BLE Attn "][1])
                        newRow.push((item["20"] ? item["20"]["Throughput"] : ''), (item["41"] ? item["41"]["Throughput"] : ''), (item["51"] ? item["51"]["Throughput"] : ''), (item["56"] ? item["56"]["Throughput"] : ''), (item["61"] ? item["61"]["Throughput"] : ''));
                        newRow.push((item["66"] ? item["66"]["Throughput"] : ''), (item["71"] ? item["71"]["Throughput"] : ''), (item["72"] ? item["72"]["Throughput"] : ''), (item["73"] ? item["73"]["Throughput"] : ''), (item["74"] ? item["74"]["Throughput"] : ''), (item["75"] ? item["75"]["Throughput"] : ''), (item["76"] ? item["76"]["Throughput"] : ''), (item["77"] ? item["77"]["Throughput"] : ''));
                        newRow.push((item["78"] ? item["78"]["Throughput"] : ''), (item["79"] ? item["79"]["Throughput"] : ''), (item["80"] ? item["80"]["Throughput"] : ''), (item["81"] ? item["81"]["Throughput"] : ''), (item["82"] ? item["82"]["Throughput"] : ''), (item["83"] ? item["83"]["Throughput"] : ''), (item["84"] ? item["84"]["Throughput"] : ''), (item["85"] ? item["85"]["Throughput"] : ''));
                        newRow.push((item["86"] ? item["86"]["Throughput"] : ''), (item["87"] ? item["87"]["Throughput"] : ''), (item["88"] ? item["88"]["Throughput"] : ''), (item["89"] ? item["89"]["Throughput"] : ''), (item["90"] ? item["90"]["Throughput"] : ''), (item["91"] ? item["91"]["Throughput"] : ''), (item["92"] ? item["92"]["Throughput"] : ''), (item["93"] ? item["94"]["Throughput"] : ''));
                        newRow.push((item["94"] ? item["94"]["Throughput"] : ''), (item["95"] ? item["95"]["Throughput"] : ''), (item["96"] ? item["96"]["Throughput"] : ''), (item["97"] ? item["97"]["Throughput"] : ''), (item["98"] ? item["98"]["Throughput"] : ''), (item["99"] ? item["99"]["Throughput"] : ''), (item["100"] ? item["100"]["Throughput"] : ''), (item["101"] ? item["101"]["Throughput"] : ''));
                        newRow.push((item["102"] ? item["102"]["Throughput"] : ''), (item["103"] ? item["103"]["Throughput"] : ''), (item["104"] ? item["104"]["Throughput"] : ''), (item["105"] ? item["105"]["Throughput"] : ''), (item["106"] ? item["106"]["Throughput"] : ''), (item["107"] ? item["107"]["Rssi"] : ''), (item["108"] ? item["108"]["Rssi"] : ''), (item["109"] ? item["109"]["Rssi"] : ''), (item["110"] ? item["110"]["Rssi"] : ''), (item["111"] ? item["111"]["Rssi"] : ''));
                        newRow.push((item["112"] ? item["112"]["Throughput"] : ''), (item["113"] ? item["113"]["Throughput"] : ''), (item["114"] ? item["114"]["Throughput"] : ''), (item["115"] ? item["115"]["Throughput"] : ''), (item["116"] ? item["116"]["Throughput"] : ''));

                        startRow = worksheet.getRow(row_num);
                        for (let index = 0; index < newRow.length; index++) {
                            startRow.getCell(index + 1).value = newRow[index];
                        }
                        row_num += 1;
                        if (tracker == 4) {
                            tracker = 0;
                            row_num += 20;
                        }

                    }
                }
                await workbook.xlsx.writeFile(file); // xlsx format generated from the above template
                console.log("file - ", file);
            });
        console.log("file return- ", file);
        return file;
    } catch (err) {
        logger.error("generateUnifiedReport : ", err);
    }
}

/*
    Creates a new xlsx excel workbook from the existing BT template for given BT_MOS execution.
*/
async function generateCCReport(data, executionName, proj_type) {

    try {
        console.log("execution name--->", executionName)
        const workbook = new ExcelJS.Workbook(); // creates a new workbook
        let templateFile = config.public.path + config.public.templates + "CC_template.xlsx";
        console.log("template file---> ", templateFile)
        let file = config.public.path + config.public.output + executionName + 'KPI_Report.xlsx';
        console.log("Kpi report ---> ", file)

        await workbook.xlsx.readFile(templateFile)
            .then(async function() {
                let worksheet = workbook.getWorksheet("CC"); // get particular sheet
                let row_num = 6;
                let startRow = worksheet.getRow(row_num);

                for (let item of data) {
                    if (item['project_type'] == proj_type) {
                        let newRow = ['', '', ''];
                        //console.log("item--", item["Uni-DirectionalTx-Rx Traffic(TP Values in Kbps)"]["E0"]["Master"]["Tx"]);
                        if (item["Header data"] == null) {
                            newRow.push(item["Test_case_Id"], item["TEST CASES"], item["Test Steps"], item["Test Status"], item["WLAN Standalone FW"],
                                item["BT Standalone FW"], item["BLE Standalone FW"], item["Combo FW"], item["CPU-1 (WLAN)"], item["CPU-2 (BT)"],
                                item["Band"], item["Band Width"], item["MCS"], item["RU Size"], item["Antenna Configuration"], item["Spatial Stream"],
                                item["Comments"]);

                            if (typeof item["Tx-Power_Expected [dBm]"] != 'undefined') {
                                newRow.push(item["Tx-Power_Expected [dBm]"] ? item["Tx-Power_Expected [dBm]"] : '');
                            } else { newRow.push('') }

                            if (typeof item["Tx-Power_Measured [dBm]"] != 'undefined') {
                                newRow.push(item["Tx-Power_Measured [dBm]"] ? item["Tx-Power_Measured [dBm]"] : '');
                            } else { newRow.push('') }

                            if (typeof item["TP_Measured [Mbps]"] != 'undefined') {
                                newRow.push(item["TP_Measured [Mbps]"] ? item["TP_Measured [Mbps]"] : '');
                            } else { newRow.push('') }

                            if (typeof item["I_V1_1"] != 'undefined') {
                                newRow.push(item["I_V1_1"]["Measured (mA)"] ? item["I_V1_1"]["Measured (mA)"] : '', item["I_V1_1"]["Reference(mA)"] ? item["I_V1_1"]["Reference(mA)"] : '');
                            } else { newRow.push('', '') }

                            if (typeof item["I_V1_8"] != 'undefined') {
                                newRow.push(item["I_V1_8"]["Measured (mA)"] ? item["I_V1_8"]["Measured (mA)"] : '', item["I_V1_8"]["Reference(mA)"] ? item["I_V1_8"]["Reference(mA)"] : '');
                            } else { newRow.push('', '') }

                            if (typeof item["I_V2_2"] != 'undefined') {
                                newRow.push(item["I_V2_2"]["Measured (mA)"] ? item["I_V2_2"]["Measured (mA)"] : '', item["I_V2_2"]["Reference(mA)"] ? item["I_V2_2"]["Reference(mA)"] : '');
                            } else { newRow.push('', '') }

                            if (typeof item["I_V3_3"] != 'undefined') {
                                newRow.push(item["I_V3_3"]["Measured (mA)"] ? item["I_V3_3"]["Measured (mA)"] : '', item["I_V3_3"]["Reference(mA)"] ? item["I_V3_3"]["Reference(mA)"] : '');
                            } else { newRow.push('', '') }

                            if (typeof item["I_V5"] != 'undefined') {
                                newRow.push(item["I_V5"]["Measured (mA)"] ? item["I_V5"]["Measured (mA)"] : '', item["I_V5"]["Reference(mA)"] ? item["I_V5"]["Reference(mA)"] : '');
                            } else { newRow.push('', '') }

                            if (typeof item["I_V1_1"] != 'undefined') {
                                newRow.push(item["I_V3_6 | V_BAT"]["Measured (mA)"] ? item["I_V3_6 | V_BAT"]["Measured (mA)"] : '', item["I_V3_6 | V_BAT"]["Reference(mA)"] ? item["I_V3_6 | V_BAT"]["Reference(mA)"] : '');
                            } else { newRow.push('', '') }

                            startRow = worksheet.getRow(row_num);
                            for (let index = 0; index < newRow.length; index++) {
                                startRow.getCell(index + 1).value = newRow[index];
                            }
                            row_num += 1;
                        } else {
                            if (item['Header data']['Header1'] != null) {
                                newRow = [];
                                newRow.push('', '', '');
                                newRow.push(item['Header data']['Header1']['S#NO#'], item['Header data']['Header1']['Test Cases']);
                                startRow = worksheet.getRow(row_num);
                                for (let index = 0; index < newRow.length; index++) {
                                    startRow.getCell(index + 1).value = newRow[index];
                                }
                                row_num += 1;
                            }
                            if (item['Header data']['Header2'] != null) {
                                newRow = [];
                                newRow.push('', '', '');
                                newRow.push(item['Header data']['Header2']['S#NO#'], item['Header data']['Header2']['Test Cases']);
                                startRow = worksheet.getRow(row_num);
                                for (let index = 0; index < newRow.length; index++) {
                                    startRow.getCell(index + 1).value = newRow[index];
                                }
                                row_num += 1;
                            }
                            if (item['Header data']['Header3'] != null) {
                                newRow = [];
                                newRow.push('', '', '');
                                newRow.push(item['Header data']['Header3']['S#NO#'], item['Header data']['Header3']['Test Cases']);
                                startRow = worksheet.getRow(row_num);
                                for (let index = 0; index < newRow.length; index++) {
                                    startRow.getCell(index + 1).value = newRow[index];
                                }
                                row_num += 1;
                            }
                            if (item['Header data']['Header4'] != null) {
                                newRow = [];
                                newRow.push('', '', '');
                                newRow.push(item['Header data']['Header4']['S#NO#'], item['Header data']['Header4']['Test Cases']);
                                startRow = worksheet.getRow(row_num);
                                for (let index = 0; index < newRow.length; index++) {
                                    startRow.getCell(index + 1).value = newRow[index];
                                }
                                row_num += 1;
                            }
                            newRow = [];
                            newRow.push('', '', '');
                            newRow.push(item["Test_case_Id"], item["TEST CASES"], item["Test Steps"], item["Test Status"], item["WLAN Standalone FW"],
                                item["BT Standalone FW"], item["BLE Standalone FW"], item["Combo FW"], item["CPU-1 (WLAN)"], item["CPU-2 (BT)"],
                                item["Band"], item["Band Width"], item["MCS"], item["RU Size"], item["Antenna Configuration"], item["Spatial Stream"],
                                item["Comments"]);

                            if (typeof item["Tx-Power_Expected [dBm]"] != 'undefined') {
                                newRow.push(item["Tx-Power_Expected [dBm]"] ? item["Tx-Power_Expected [dBm]"] : '');
                            } else { newRow.push('') }

                            if (typeof item["Tx-Power_Measured [dBm]"] != 'undefined') {
                                newRow.push(item["Tx-Power_Measured [dBm]"] ? item["Tx-Power_Measured [dBm]"] : '');
                            } else { newRow.push('') }

                            if (typeof item["TP_Measured [Mbps]"] != 'undefined') {
                                newRow.push(item["TP_Measured [Mbps]"] ? item["TP_Measured [Mbps]"] : '');
                            } else { newRow.push('') }

                            if (typeof item["I_V1_1"] != 'undefined') {
                                newRow.push(item["I_V1_1"]["Measured (mA)"] ? item["I_V1_1"]["Measured (mA)"] : '', item["I_V1_1"]["Reference(mA)"] ? item["I_V1_1"]["Reference(mA)"] : '');
                            } else { newRow.push('', '') }

                            if (typeof item["I_V1_8"] != 'undefined') {
                                newRow.push(item["I_V1_8"]["Measured (mA)"] ? item["I_V1_8"]["Measured (mA)"] : '', item["I_V1_8"]["Reference(mA)"] ? item["I_V1_8"]["Reference(mA)"] : '');
                            } else { newRow.push('', '') }

                            if (typeof item["I_V2_2"] != 'undefined') {
                                newRow.push(item["I_V2_2"]["Measured (mA)"] ? item["I_V2_2"]["Measured (mA)"] : '', item["I_V2_2"]["Reference(mA)"] ? item["I_V2_2"]["Reference(mA)"] : '');
                            } else { newRow.push('', '') }

                            if (typeof item["I_V3_3"] != 'undefined') {
                                newRow.push(item["I_V3_3"]["Measured (mA)"] ? item["I_V3_3"]["Measured (mA)"] : '', item["I_V3_3"]["Reference(mA)"] ? item["I_V3_3"]["Reference(mA)"] : '');
                            } else { newRow.push('', '') }

                            if (typeof item["I_V5"] != 'undefined') {
                                newRow.push(item["I_V5"]["Measured (mA)"] ? item["I_V5"]["Measured (mA)"] : '', item["I_V5"]["Reference(mA)"] ? item["I_V5"]["Reference(mA)"] : '');
                            } else { newRow.push('', '') }

                            if (typeof item["I_V1_1"] != 'undefined') {
                                newRow.push(item["I_V3_6 | V_BAT"]["Measured (mA)"] ? item["I_V3_6 | V_BAT"]["Measured (mA)"] : '', item["I_V3_6 | V_BAT"]["Reference(mA)"] ? item["I_V3_6 | V_BAT"]["Reference(mA)"] : '');
                            } else { newRow.push('', '') }

                            startRow = worksheet.getRow(row_num);
                            for (let index = 0; index < newRow.length; index++) {
                                startRow.getCell(index + 1).value = newRow[index];
                            }
                            row_num += 1;


                        }
                    }
                }
                await workbook.xlsx.writeFile(file); // xlsx format generated from the above template
                console.log("file - ", file);
            });
        console.log("file return- ", file);
        return file;
    } catch (err) {
        logger.error("generateUnifiedReport : ", err);
    }
}



/*
    Creates a new xlsx excel workbook from the existing DFS template for given DFS execution.
*/
async function generateDFSReport(data, executionName, proj_type) {

    try {
        //console.log("Data---> ", data);
        console.log("execution name--->", executionName)
        const workbook = new ExcelJS.Workbook(); // creates a new workbook
        let templateFile = config.public.path + config.public.templates + "CC_template.xlsx";
        console.log("template file---> ", templateFile)
        let file = config.public.path + config.public.output + executionName + 'KPI_Report.xlsx';
        console.log("Kpi report ---> ", file)

        await workbook.xlsx.readFile(templateFile)
            .then(async function() {
                let worksheet = workbook.getWorksheet("DFS"); // get particular sheet
                let row_num = 8;
                let startRow = worksheet.getRow(row_num);

                for (let item of data) {
                    if (item['project_type'] == proj_type) {
                        let newRow = ['', ''];
                        //console.log("item--", item["Uni-DirectionalTx-Rx Traffic(TP Values in Kbps)"]["E0"]["Master"]["Tx"]);
                        if (item['Header data'] == null) {
                            newRow.push(item["Test_case_Id"], item["TEST CASES"], item["RESULTS"], '', item["COMMENTS"], item["TestType"],
                                item["Region"], item["Country"], item["Mode"], item["Channel Bandwidth"], item["Spatial Streams"],
                                item["Radar Waveform"], item["Radar Pulse Frequency @ Lower Edge| Fc | Higher Edge"], item["Required Detection NT %"], item["Occupied Channel BW in MHz"], item["Channel Loading %"], item["Automation execution time (mins)"], '',
                                item["36"], item["40"], item["44"], item["48"], item["52"], item["56"], item["60"], item["64"], item["100"], item["104"], item["108"], item["112"], item["116"], item["120"], item["124"], item["128"], item["132"], item["136"], item["140"], item["144"], '',
                                item["Automation execution time (mins)"], item["Automation Status (Y/N)"], item["Manual execution time (mins)"], item["Falcon RT"], item["Rb3 RT"], item["Rb3P RT"], item["CA2 MM-Linux"], item["CA2 MM-Android"], item["KF2 MM-Linux"], item["KF2 MM-Android"], item["CA2 Generic"], item["KF2 Generic"], item["RB3P Generic"],
                                item["9000S Generic"], item["9098 Generic"], item["9097 Generic"], item["Firecrest Generic"], item["SCBT"]);

                            startRow = worksheet.getRow(row_num);
                            for (let index = 0; index < newRow.length; index++) {
                                startRow.getCell(index + 1).value = newRow[index];
                            }
                            row_num += 1;

                        } else {
                            if (item['Header data']['Header1'] != null) {
                                newRow = [];
                                newRow.push('', '');
                                newRow.push(item['Header data']['Header1']['S#NO#'], item['Header data']['Header1']['Test Cases']);
                                startRow = worksheet.getRow(row_num);
                                for (let index = 0; index < newRow.length; index++) {
                                    startRow.getCell(index + 1).value = newRow[index];
                                }
                                row_num += 1;
                            }
                            if (item['Header data']['Header2'] != null) {
                                newRow = [];
                                newRow.push('', '');
                                newRow.push(item['Header data']['Header2']['S#NO#'], item['Header data']['Header2']['Test Cases']);
                                startRow = worksheet.getRow(row_num);
                                for (let index = 0; index < newRow.length; index++) {
                                    startRow.getCell(index + 1).value = newRow[index];
                                }
                                row_num += 1;
                            }
                            if (item['Header data']['Header3'] != null) {
                                newRow = [];
                                newRow.push('', '');
                                newRow.push(item['Header data']['Header3']['S#NO#'], item['Header data']['Header3']['Test Cases']);
                                startRow = worksheet.getRow(row_num);
                                for (let index = 0; index < newRow.length; index++) {
                                    startRow.getCell(index + 1).value = newRow[index];
                                }
                                row_num += 1;
                            }
                            if (item['Header data']['Header4'] != null) {
                                newRow = [];
                                newRow.push('', '');
                                newRow.push(item['Header data']['Header4']['S#NO#'], item['Header data']['Header4']['Test Cases']);
                                startRow = worksheet.getRow(row_num);
                                for (let index = 0; index < newRow.length; index++) {
                                    startRow.getCell(index + 1).value = newRow[index];
                                }
                                row_num += 1;
                            }

                            newRow = [];
                            newRow.push('', '');
                            newRow.push(item["Test_case_Id"], item["TEST CASES"], item["RESULTS"], '', item["COMMENTS"], item["TestType"],
                                item["Region"], item["Country"], item["Mode"], item["Channel Bandwidth"], item["Spatial Streams"],
                                item["Radar Waveform"], item["Radar Pulse Frequency @ Lower Edge| Fc | Higher Edge"], item["Required Detection NT %"], item["Occupied Channel BW in MHz"], item["Channel Loading %"], item["Automation execution time (mins)"], '',
                                item["36"], item["40"], item["44"], item["48"], item["52"], item["56"], item["60"], item["64"], item["100"], item["104"], item["108"], item["112"], item["116"], item["120"], item["124"], item["128"], item["132"], item["136"], item["140"], item["144"], '',
                                item["Automation execution time (mins)"], item["Automation Status (Y/N)"], item["Manual execution time (mins)"], item["Falcon RT"], item["Rb3 RT"], item["Rb3P RT"], item["CA2 MM-Linux"], item["CA2 MM-Android"], item["KF2 MM-Linux"], item["KF2 MM-Android"], item["CA2 Generic"], item["KF2 Generic"], item["RB3P Generic"],
                                item["9000S Generic"], item["9098 Generic"], item["9097 Generic"], item["Firecrest Generic"], item["SCBT"]);

                            startRow = worksheet.getRow(row_num);
                            for (let index = 0; index < newRow.length; index++) {
                                startRow.getCell(index + 1).value = newRow[index];
                            }
                            row_num += 1;

                        }


                    }

                }
                await workbook.xlsx.writeFile(file); // xlsx format generated from the above template
                console.log("file - ", file);
            });
        console.log("file return- ", file);
        return file;
    } catch (err) {
        logger.error("generateUnifiedReport : ", err);
    }
}

/*
    Creates a new xlsx excel workbook from the existing WACP_Coex template for given WACP_Coex execution.
*/
async function generateWACP_CoexReport(data, executionName, proj_type) {

    try {
        //console.log("Data---> ", data);
        console.log("execution name--->", executionName)
        const workbook = new ExcelJS.Workbook(); // creates a new workbook
        let templateFile = config.public.path + config.public.templates + "WACP_Templates.xlsx";
        console.log("template file---> ", templateFile)
        let file = config.public.path + config.public.output + executionName + 'KPI_Report.xlsx';
        console.log("Kpi report ---> ", file)

        await workbook.xlsx.readFile(templateFile)
            .then(async function() {
                let worksheet = workbook.getWorksheet("WACP_COEX"); // get particular sheet
                let row_num = 17;
                let startRow = worksheet.getRow(row_num);
                let counter = 0;
                for (let item of data) {
                    console.log("Im here2")

                    if (item['project_type'] == proj_type) {
                        let finalArray = [];
                        if (counter == 0) {

                            let row_num = 2;
                            let newRow1 = ['', 'Build Version', ''];
                            newRow1.push((item["Common"]["Device Configuration"]["Build Version"] ? item["Common"]["Device Configuration"]["Build Version"] : ''));
                            finalArray.push(newRow1);

                            let newRow2 = ['', 'SoC Info', ''];
                            newRow2.push((item["Common"]["Device Configuration"]["SoC Info"] ? item["Common"]["Device Configuration"]["SoC Info"] : ''), '', '', '', '', 'TCP Bi-directional throughput', '', '', (item["Common"]["Key Performance Indicator"]["TCP Bi-directional throughput"] ? item["Common"]["Key Performance Indicator"]["TCP Bi-directional throughput"] : ''));
                            finalArray.push(newRow2);

                            let newRow3 = ['', 'Environment', ''];
                            newRow3.push((item["Common"]["Device Configuration"]["Environment"] ? item["Common"]["Device Configuration"]["Environment"] : ''), '', '', '', '', 'UDP Bi-directional throughput', '', '', (item["Common"]["Key Performance Indicator"]["UDP Bi-directional throughput"] ? item["Common"]["Key Performance Indicator"]["UDP Bi-directional throughput"] : ''));
                            finalArray.push(newRow3);

                            let newRow4 = ['', 'Configuration', ''];
                            newRow4.push((item["Common"]["Device Configuration"]["Configuration"] ? item["Common"]["Device Configuration"]["Configuration"] : ''), '', '', '', '', 'Latency', '', '', (item["Common"]["Key Performance Indicator"]["Latency"] ? item["Common"]["Key Performance Indicator"]["Latency"] : ''));
                            finalArray.push(newRow4);

                            let newRow5 = ['', 'Ref. STA1 (Iphone)', ''];
                            newRow5.push((item["Common"]["Device Configuration"]["Ref STA1 (Iphone)"] ? item["Common"]["Device Configuration"]["Ref STA1 (Iphone)"] : ''), '', '', '', '', 'Packet Loss', '', '', (item["Common"]["Key Performance Indicator"]["Packet Loss"] ? item["Common"]["Key Performance Indicator"]["Packet Loss"] : ''));
                            finalArray.push(newRow5);

                            let newRow6 = ['', 'Notes', ''];
                            newRow6.push((item["Common"]["Device Configuration"]["Notes"] ? item["Common"]["Device Configuration"]["Notes"] : ''));
                            finalArray.push(newRow6);

                            for (let i = 0; i < finalArray.length; i++) {
                                for (let j = 0; j < finalArray[i].length; j++) {
                                    startRow = worksheet.getRow(row_num);
                                    for (let index = 0; index < finalArray[i].length; index++) {
                                        startRow.getCell(index + 1).value = finalArray[i][index];
                                    }
                                }
                                row_num += 1;
                            }

                            counter++;
                        }

                        let newRow = [''];
                        if (item['Header data'] == null) {
                            newRow.push(item["Test Mode"], item["Test_case_Id"], item["Test Case"], item["Duration [min]"], item["TCP UL (Mbps)"],
                                item["TCP DL (Mbps)"], item["UDP UL (Mbps)"], item["UDP DL (Mbps)"]);
                            newRow.push((item["Ping Letancy"]["Min (ms)"] ? item["Ping Letancy"]["Min (ms)"] : ''), (item["Ping Letancy"]["Max (ms)"] ? item["Ping Letancy"]["Max (ms)"] : ''),
                                (item["Ping Letancy"]["Avg (ms)"] ? item["Ping Letancy"]["Avg (ms)"] : ''), (item["Ping Letancy"]["Deviation (ms)"] ? item["Ping Letancy"]["Deviation (ms)"] : ''), '',
                                (item["MMH_Header"]["MMH-Client TP1"] ? item["MMH_Header"]["MMH-Client TP1"] : ''), (item["MMH_Header"]["MMH-Client TP2"] ? item["MMH_Header"]["MMH-Client TP2"] : ''),
                                item["BT quality"], '', );

                            startRow = worksheet.getRow(row_num);
                            for (let index = 0; index < newRow.length; index++) {
                                startRow.getCell(index + 1).value = newRow[index];
                            }
                            row_num += 1;

                        } else {
                            let finalArray = [];
                            if (item['Header data']['Header1'] != null) {
                                newRow1 = [];
                                newRow1.push('', '', item['Header data']['Header1']['TC ID'], item['Header data']['Header1']['Test Case']);
                                finalArray.push(newRow1)

                            }
                            if (item['Header data']['Header2'] != null) {
                                newRow2 = [];
                                newRow2.push('', '', item['Header data']['Header2']['TC ID'], item['Header data']['Header2']['Test Case']);
                                finalArray.push(newRow2)
                            }

                            if (item['Header data']['Header3'] != null) {
                                newRow3 = [];
                                newRow3.push('', '', item['Header data']['Header3']['TC ID'], item['Header data']['Header3']['Test Case']);
                                finalArray.push(newRow3)

                            }
                            if (item['Header data']['Header4'] != null) {
                                newRow4 = [];
                                newRow4.push('', '', item['Header data']['Header4']['TC ID'], item['Header data']['Header4']['Test Case']);
                                finalArray.push(newRow4)
                            }

                            newRow5 = [];
                            newRow5.push('', item["Test Mode"], item["Test_case_Id"], item["Test Case"], item["Duration [min]"], item["TCP UL (Mbps)"],
                                item["TCP DL (Mbps)"], item["UDP UL (Mbps)"], item["UDP DL (Mbps)"]);
                            newRow5.push((item["Ping Letancy"]["Min (ms)"] ? item["Ping Letancy"]["Min (ms)"] : ''), (item["Ping Letancy"]["Max (ms)"] ? item["Ping Letancy"]["Max (ms)"] : ''),
                                (item["Ping Letancy"]["Avg (ms)"] ? item["Ping Letancy"]["Avg (ms)"] : ''), (item["Ping Letancy"]["Deviation (ms)"] ? item["Ping Letancy"]["Deviation (ms)"] : ''), '',
                                (item["MMH_Header"]["MMH-Client TP1"] ? item["MMH_Header"]["MMH-Client TP1"] : ''), (item["MMH_Header"]["MMH-Client TP2"] ? item["MMH_Header"]["MMH-Client TP2"] : ''),
                                item["BT quality"], '', );
                            finalArray.push(newRow5)


                            for (let i = 0; i < finalArray.length; i++) {
                                for (let j = 0; j < finalArray[i].length; j++) {
                                    startRow = worksheet.getRow(row_num);
                                    for (let index = 0; index < finalArray[i].length; index++) {
                                        startRow.getCell(index + 1).value = finalArray[i][index];
                                    }
                                }
                                row_num += 1;
                            }

                        }


                    }

                }
                await workbook.xlsx.writeFile(file); // xlsx format generated from the above template
                console.log("file - ", file);
            });
        console.log("file return- ", file);
        return file;
    } catch (err) {
        logger.error("generateUnifiedReport : ", err);
    }
}
/*
    Creates a new xlsx excel workbook from the existing WACP_template for given WACP_Wifi execution.
*/
async function generateWACP_WifiReport(data, executionName, proj_type) {

    try {
        //console.log("Data---> ", data);
        console.log("execution name--->", executionName)
        const workbook = new ExcelJS.Workbook(); // creates a new workbook
        let templateFile = config.public.path + config.public.templates + "WACP_Templates.xlsx";
        console.log("template file---> ", templateFile)
        let file = config.public.path + config.public.output + executionName + 'KPI_Report.xlsx';
        console.log("Kpi report ---> ", file)

        await workbook.xlsx.readFile(templateFile)
            .then(async function() {
                let worksheet = workbook.getWorksheet("WACP_WLAN"); // get particular sheet
                let row_num = 17;
                let startRow = worksheet.getRow(row_num);
                let counter = 0;
                for (let item of data) {
                    if (item['project_type'] == proj_type) {
                        let finalArray = [];
                        if (counter == 0) {
                            let row_num = 2;
                            let newRow1 = ['', 'Build Version', ''];
                            newRow1.push((item["Common"]["Device Configuration"]["Build Version"] ? item["Common"]["Device Configuration"]["Build Version"] : ''));
                            finalArray.push(newRow1);

                            let newRow2 = ['', 'SoC Info', ''];
                            newRow2.push((item["Common"]["Device Configuration"]["SoC Info"] ? item["Common"]["Device Configuration"]["SoC Info"] : ''), '', '', '', '', 'TCP Bi-directional throughput', '', '', (item["Common"]["Key Performance Indicator"]["TCP Bi-directional throughput"] ? item["Common"]["Key Performance Indicator"]["TCP Bi-directional throughput"] : ''));
                            finalArray.push(newRow2);

                            let newRow3 = ['', 'Environment', ''];
                            newRow3.push((item["Common"]["Device Configuration"]["Environment"] ? item["Common"]["Device Configuration"]["Environment"] : ''), '', '', '', '', 'UDP Bi-directional throughput', '', '', (item["Common"]["Key Performance Indicator"]["UDP Bi-directional throughput"] ? item["Common"]["Key Performance Indicator"]["UDP Bi-directional throughput"] : ''));
                            finalArray.push(newRow3);

                            let newRow4 = ['', 'Configuration', ''];
                            newRow4.push((item["Common"]["Device Configuration"]["Configuration"] ? item["Common"]["Device Configuration"]["Configuration"] : ''), '', '', '', '', 'Latency', '', '', (item["Common"]["Key Performance Indicator"]["Latency"] ? item["Common"]["Key Performance Indicator"]["Latency"] : ''));
                            finalArray.push(newRow4);

                            let newRow5 = ['', 'Ref. STA1 (Iphone)', ''];
                            newRow5.push((item["Common"]["Device Configuration"]["Ref STA1 (Iphone)"] ? item["Common"]["Device Configuration"]["Ref STA1 (Iphone)"] : ''), '', '', '', '', 'Packet Loss', '', '', (item["Common"]["Key Performance Indicator"]["Packet Loss"] ? item["Common"]["Key Performance Indicator"]["Packet Loss"] : ''));
                            finalArray.push(newRow5);

                            let newRow6 = ['', 'Notes', ''];
                            newRow6.push((item["Common"]["Device Configuration"]["Notes"] ? item["Common"]["Device Configuration"]["Notes"] : ''));
                            finalArray.push(newRow6);

                            for (let i = 0; i < finalArray.length; i++) {
                                for (let j = 0; j < finalArray[i].length; j++) {
                                    startRow = worksheet.getRow(row_num);
                                    for (let index = 0; index < finalArray[i].length; index++) {
                                        startRow.getCell(index + 1).value = finalArray[i][index];
                                    }
                                }
                                row_num += 1;
                            }
                            counter++;

                        }

                        let newRow = [''];
                        if (item['Header data'] == null) {
                            newRow.push(item["Test Mode"], item["Test_case_Id"], item["Test Case"], item["Duration [min]"], item["TCP UL (Mbps)"],
                                item["TCP DL (Mbps)"], item["UDP UL (Mbps)"], item["UDP DL (Mbps)"]);
                            newRow.push((item["Ping Letancy"]["Min (ms)"] ? item["Ping Letancy"]["Min (ms)"] : ''), (item["Ping Letancy"]["Max (ms)"] ? item["Ping Letancy"]["Max (ms)"] : ''),
                                (item["Ping Letancy"]["Avg (ms)"] ? item["Ping Letancy"]["Avg (ms)"] : ''), (item["Ping Letancy"]["Deviation (ms)"] ? item["Ping Letancy"]["Deviation (ms)"] : ''), item["Result"], '', );

                            startRow = worksheet.getRow(row_num);
                            for (let index = 0; index < newRow.length; index++) {
                                startRow.getCell(index + 1).value = newRow[index];
                            }
                            row_num += 1;

                        } else {
                            let finalArray = [];
                            if (item['Header data']['Header1'] != null) {
                                newRow1 = [];
                                newRow1.push('', '', item['Header data']['Header1']['TC ID'], item['Header data']['Header1']['Test Case']);
                                finalArray.push(newRow1)

                            }
                            if (item['Header data']['Header2'] != null) {
                                newRow2 = [];
                                newRow2.push('', '', item['Header data']['Header2']['TC ID'], item['Header data']['Header2']['Test Case']);
                                finalArray.push(newRow2)
                            }

                            if (item['Header data']['Header3'] != null) {
                                newRow3 = [];
                                newRow3.push('', '', item['Header data']['Header3']['TC ID'], item['Header data']['Header3']['Test Case']);
                                finalArray.push(newRow3)

                            }
                            if (item['Header data']['Header4'] != null) {
                                newRow4 = [];
                                newRow4.push('', '', item['Header data']['Header4']['TC ID'], item['Header data']['Header4']['Test Case']);
                                finalArray.push(newRow4)
                            }

                            newRow5 = [];
                            newRow5.push('', item["Test Mode"], item["Test_case_Id"], item["Test Case"], item["Duration [min]"], item["TCP UL (Mbps)"],
                                item["TCP DL (Mbps)"], item["UDP UL (Mbps)"], item["UDP DL (Mbps)"]);
                            newRow.push((item["Ping Letancy"]["Min (ms)"] ? item["Ping Letancy"]["Min (ms)"] : ''), (item["Ping Letancy"]["Max (ms)"] ? item["Ping Letancy"]["Max (ms)"] : ''),
                                (item["Ping Letancy"]["Avg (ms)"] ? item["Ping Letancy"]["Avg (ms)"] : ''), (item["Ping Letancy"]["Deviation (ms)"] ? item["Ping Letancy"]["Deviation (ms)"] : ''), item["Result"], '', );
                            finalArray.push(newRow5)

                            for (let i = 0; i < finalArray.length; i++) {
                                for (let j = 0; j < finalArray[i].length; j++) {
                                    startRow = worksheet.getRow(row_num);
                                    for (let index = 0; index < finalArray[i].length; index++) {
                                        startRow.getCell(index + 1).value = finalArray[i][index];
                                    }
                                }
                                row_num += 1;
                            }

                        }
                    }

                }
                await workbook.xlsx.writeFile(file); // xlsx format generated from the above template
                console.log("file - ", file);
            });
        console.log("file return- ", file);
        return file;
    } catch (err) {
        logger.error("generateUnifiedReport : ", err);
    }
}