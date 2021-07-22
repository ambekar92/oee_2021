const { ALPN_ENABLED } = require("constants");

var config = {
    app: {
        port: '9008',
        saltRounds: 10
    },
    mongodb: {
        host: 'localhost',
        port: '27017',
        schema: 'Test001'
    },
    jwt: {
        sessionTimeout: 28800,
        tokenTimeout: 28800,
        secretKey: '3rd24d92rd32jdjewofjewf8'
    },
    xlsConversion: {
        runSheetName: "RUN"
    },
    mqtt: {
        host: '127.0.0.1',
        port: '1883',
        resultTopic: 'nxp/testExecutionResult/',
        statusTopic: 'nxp/testExecutionStatus/',
        summaryTopic: 'nxp/testExecutionSummary/',
        registerTopic: 'nxp/testbed/register',
        publishTopic: 'nxp/testexecution/',
        errorTopic: 'nxp/testbed/error'
    },
    public: {
        path: './public/',
        templates: 'Templates/',
        output: 'Output/',
        configuration: 'Configurations/',
        testplan: 'Testplans/',
        watsversions: 'WatsVersions/',
        batsversions: 'BatsVersions/',
    },
    qtest: {
        permission: true,
        baseURL: 'https://qtest.tulip.nxp.com',
        access_token: '17b116ba-827e-482d-8b32-09a3bff2cbec',
        tls_ca_file: '../../config/tls-ca-bundle.pem',
        project_name: 'GES_AutomationIntegration_Trial',
        root_module: 'Automation',
        uploadTemplate: { 'id': "123456789", 'template': 'Upload PASS/FAIL' }
    }
}

module.exports = config;