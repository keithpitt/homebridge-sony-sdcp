var Service, Characteristic;
var SdcpClient = require('sony-sdcp-com');
var SonyProjectorCharacteristics;

PORT = 53484;

module.exports = function(homebridge) {
    Service = homebridge.hap.Service;
    Characteristic = homebridge.hap.Characteristic;
    SonyProjectorCharacteristics = require('./sony-characteristics').SonyProjectorCharacteristics(Characteristic);
    homebridge.registerAccessory("homebridge-sony-sdcp", "sony-sdcp-projector", ProjectorAccessory);
};

function ProjectorAccessory(log, config) {
    this.log = log;
    this.config = config;
    this.name = config["name"];
    this.lastState = 0;
    this.ratio = SonyProjectorCharacteristics.ScreenAspectRatio.NORMAL;
    this.pictureMode = Characteristic.PictureMode.OTHER;
    this.myClient = SdcpClient.SdcpClient({address: this.config["host"], port: PORT});

    this.switchService = new Service.Switch(this.name);
    this.switchService
        .getCharacteristic(Characteristic.On)
        .on('get', this.getCurrentState.bind(this))
        .on('set', this.setCurrentState.bind(this));

    this.switchService.setCharacteristic(Characteristic.ConfiguredName, this.name)
    this.switchService.getCharacteristic(Characteristic.ConfiguredName).setProps({
      perms: [Characteristic.Perms.READ]
    });

    this.switchService.addCharacteristic(SonyProjectorCharacteristics.ScreenAspectRatio)
    this.switchService
        .getCharacteristic(SonyProjectorCharacteristics.ScreenAspectRatio)
        .on('get', this.getAspectRatio.bind(this))
        .on('set', this.setAspectRatio.bind(this));

    // this.switchService.addCharacteristic(SonyProjectorCharacteristics.ScreenPicturePosition)
    // this.switchService
    //     .getCharacteristic(SonyProjectorCharacteristics.ScreenPicturePosition)
    //     .on('get', this.getPicturePosition.bind(this))
    //     .on('set', this.setPicturePosition.bind(this));

    this.switchService.addCharacteristic(Characteristic.PictureMode);
    this.switchService
        .getCharacteristic(Characteristic.PictureMode)
        .on('get', this.getPictureMode.bind(this))
        .on('set', this.setPictureMode.bind(this));

    this.informationService = new Service.AccessoryInformation();
    this.informationService
       .setCharacteristic(Characteristic.Name, this.name)
       .setCharacteristic(Characteristic.Manufacturer, "Sony")
       .setCharacteristic(Characteristic.Model, "Unknown")
       .setCharacteristic(Characteristic.SerialNumber, "Unknown")
       .setCharacteristic(Characteristic.FirmwareRevision, "Unknown");
}

ProjectorAccessory.prototype.getServices = function() {
    return [ this.informationService, this.switchService ];
};

ProjectorAccessory.prototype.getAspectRatio = function (callback) {
    this.log("Requested Aspect Ratio, before request it is %s", this.ratio);
    this.myClient.getAspectRatio().then (function(ratio) {
        this.ratio = ratio;
        callback(null, this.ratio);
    }.bind(this))
     .catch(function(ratio) {
        console.log("Error retrieving Aspect Ratio");
        callback(null,0);
    });
}

ProjectorAccessory.prototype.setAspectRatio = function (ratio, callback) {
    this.log("Requested Aspect Ratio change from %s to %s", this.ratio, ratio);
    switch (ratio) {
       case SonyProjectorCharacteristics.ScreenAspectRatio.NORMAL:
          this.myClient.setAspectRatio('0001');
          this.ratio = SonyProjectorCharacteristics.ScreenAspectRatio.NORMAL;
          break
       case SonyProjectorCharacteristics.ScreenAspectRatio.ZOOM_1_85:
          this.myClient.setAspectRatio('000C');
          this.ratio = SonyProjectorCharacteristics.ScreenAspectRatio.ZOOM_1_85;
          break
       case SonyProjectorCharacteristics.ScreenAspectRatio.ZOOM_2_35:
          this.myClient.setAspectRatio('000D');
          this.ratio = SonyProjectorCharacteristics.ScreenAspectRatio.ZOOM_2_35;
          break
       case SonyProjectorCharacteristics.ScreenAspectRatio.V_STRETCH:
          this.myClient.setAspectRatio('000B');
          this.ratio = SonyProjectorCharacteristics.ScreenAspectRatio.V_STRETCH;
          break
       case SonyProjectorCharacteristics.ScreenAspectRatio.STRETCH:
          this.myClient.setAspectRatio('000E');
          this.ratio = SonyProjectorCharacteristics.ScreenAspectRatio.STRETCH;
          break
       case SonyProjectorCharacteristics.ScreenAspectRatio.SQUEEZE:
          this.myClient.setAspectRatio('000F');
          this.ratio = SonyProjectorCharacteristics.ScreenAspectRatio.SQUEEZE;
          break
       default:
          this.myClient.setAspectRatio('0001');
          this.ratio = SonyProjectorCharacteristics.ScreenAspectRatio.NORMAL;
          break
        }
       callback(null);
}


ProjectorAccessory.prototype.getPictureMode = function (callback) {
    this.log("Requested Picture Position, before request it is %s", this.pictureMode);
    callback(null,Characteristic.PictureMode.CALIBRATED_DARK);
}

ProjectorAccessory.prototype.setPictureMode = function (pictureMode, callback) {
    this.log("Requested Picture Mode change from %s to %s", this.pictureMode, pictureMode);
}

ProjectorAccessory.prototype.getCurrentState = function (callback) {
    this.log("Requested CurrentState: %s", this.lastState);
    this.myClient.getPower().then (function(status) {
        if (status === 'COOLING' || status === 'OFF') {
            this.lastState = 0;
        } else if (status === 'WARMING' || status === 'ON') {
            this.lastState = 1;
        } else {
            this.log("Error getting status: %s", status)
        }
        this.log("CurrentState: %s", this.lastState);
        callback(null,this.lastState);
    }.bind(this))
    .catch (function (lastState) {
        console.log("error in geting power state");
        callback(null,0);

    });
}

ProjectorAccessory.prototype.setCurrentState = function (value, callback) {
    this.log("Set CurrentState: %s", value);
    this.log((value ? "Turning On" : "Turning Off"));
    if (value == 1) {
        // Turn On
        this.myClient.setPower(true);
    }
    else {
        // Turn Off
        this.myClient.setPower(false);
    }
    callback(null);
};
