function ShowAlertDialog(alertStrings, alertOptions) {
    Xrm.Navigation.openAlertDialog(alertStrings, alertOptions).then(
        function success(result) {
            console.log('Alert dialog closed');
        },
        function (error) {
            console.log(error.message);
        }
    );
}

function FahrzeugAnlegen() {
    let alertStrings = {
        confirmButtonLabel: 'Ok',
        text: '',
    };
    let alertOptions = { height: 200, width: 300 };
    let data = {};
    const version = window.parent.Xrm.Page.context.getVersion();
    const apiUrl = window.parent.Xrm.Page.context.getClientUrl() + "/api/data/v" + version.slice(0, version.indexOf(".") + 2);
    const url = "/uds_leasingangebotes?$select=uds_leasingangeboteid&$expand=uds_bezugid($select=_uds_fahrzeugid_value,statecode)" +
        "&$filter=(uds_leasingangeboteid eq " + Xrm.Page.data.entity.getId() + ") and (uds_bezugid/uds_fahrzeugangeboteid ne null)";
    let req = new XMLHttpRequest();

    req.open("GET", apiUrl + url, false);

    req.setRequestHeader("Accept", "application/json");
    req.setRequestHeader("Content-Type", "application/json; charset=utf-8");
    req.setRequestHeader("OData-MaxVersion", "4.0");
    req.setRequestHeader("OData-Version", "4.0");
    req.setRequestHeader("Prefer", "odata.include-annotations=OData.Community.Display.V1.FormattedValue");
    req.onreadystatechange = function () {
        if (this.readyState == 4) {
            req.onreadystatechange = null;
            if (this.status == 200 || this.status == 204) {
                data = JSON.parse(this.response);
            }
        }
    };
    req.send();
    let fahrzeugid = data.value[0].uds_bezugid._uds_fahrzeugid_value;

    if (fahrzeugid == undefined) {
        CreateFuhrpark(alertStrings, alertOptions);
    }
    else {
        let confirmStrings = {
            text: "Für dieses Leasingangebot existiert bereits ein Auto im Fuhrpark. Bist du sicher, dass du ein neues Fahrzeug anlegen möchtest?" +
                "(Wenn ja, wird das bestehende Fahrzeug deaktiviert und du legst ein neues an)",
            confirmButtonLabel: "Ja",
            cancelButtonLabel: "Nein"
        };
        let confirmOptions = { height: 200, width: 500 };
        Xrm.Navigation.openConfirmDialog(confirmStrings, confirmOptions).then(
            function (success) {
                if (success.confirmed) {
                    var entity = {};
                    entity.statuscode = 2;
                    entity.statecode = 1;

                    var reqDeactivate = new XMLHttpRequest();
                    reqDeactivate.open("PATCH", apiUrl + "/new_fuhrparks(" + fahrzeugid + ")", true);
                    reqDeactivate.setRequestHeader("OData-MaxVersion", "4.0");
                    reqDeactivate.setRequestHeader("OData-Version", "4.0");
                    reqDeactivate.setRequestHeader("Accept", "application/json");
                    reqDeactivate.setRequestHeader("Content-Type", "application/json; charset=utf-8");
                    // reqDeactivate.onreadystatechange = function () {
                    //     if (this.readyState === 4) {
                    //         reqDeactivate.onreadystatechange = null;
                    //         if (this.status === 204) {
                    //             //Success - No Return Data - Do Something
                    //         }
                    //         else {
                    //             Xrm.Utility.alertDialog(this.statusText);
                    //         }
                    //     }
                    // };
                    reqDeactivate.send(JSON.stringify(entity));

                    //XrmCore.Commands.Deactivate.deactivatePrimaryRecord(fahrzeugid, "new_fuhrpark");
                    CreateFuhrpark(alertStrings, alertOptions);
                }
            });
    }
}

function CreateFuhrpark(alertStrings, alertOptions) {
    Xrm.Utility.showProgressIndicator('Verarbeiten...');
    let req = {
        entity: {
            entityType: "uds_leasingangebote",
            id: Xrm.Page.data.entity.getId()
        },
        getMetadata() {
            return {
                boundParameter: null,
                parameterTypes: {
                    "entity": {
                        typeName: "mscrm.uds_leasingangebote",
                        structuralProperty: 5
                    },
                },
                operationType: 0,
                operationName: "uds_FahrzeugAnlegenAction"
            };
        }
    };

    Xrm.WebApi.online.execute(req).then(
        function (data) {
            parent.window.Xrm.Utility.closeProgressIndicator();
            if (data.ok) {
                data.json().then((result) => {
                    let Result = JSON.parse(result.Result);
                    if (Result.IsSuccess) {
                        parent.window.location.reload();
                    }
                    else {
                        IsError = false;
                        alertStrings.text = Result.Error;
                        ShowAlertDialog(alertStrings, alertOptions);
                    }
                });
            }
        },
        function (error) {
            parent.window.Xrm.Utility.closeProgressIndicator();
            IsError = false;
            alertStrings.text = error.message;
            ShowAlertDialog(alertStrings, alertOptions);
        }
    );
}
