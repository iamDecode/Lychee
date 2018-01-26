const hasBlobConstructor = typeof(Blob) !== 'undefined' && (function () {
    try {
        return Boolean(new Blob());
    } catch (e) {
        return false;
    }
}());

const hasArrayBufferViewSupport = hasBlobConstructor && typeof(Uint8Array) !== 'undefined' && (function () {
    try {
        return new Blob([new Uint8Array(100)]).size === 100;
    } catch (e) {
        return false;
    }
}());

const hasToBlobSupport = (typeof HTMLCanvasElement !== "undefined" ? HTMLCanvasElement.prototype.toBlob : false);

const hasBlobSupport = (hasToBlobSupport || (typeof Uint8Array !== 'undefined' && typeof ArrayBuffer !== 'undefined' && typeof atob !== 'undefined'));

const hasReaderSupport = (typeof FileReader !== 'undefined' || typeof URL !== 'undefined');

class ImageTools {
    static resize(file, maxDimensions, callback) {
        if (typeof maxDimensions === 'function') {
            callback = maxDimensions;
            maxDimensions = {
                width: 640,
                height: 480
            };
        }

        if (!ImageTools.isSupported() || !file.type.match(/image.*/)) {
            callback(file, false);
            return false;
        }

        if (file.type.match(/image\/gif/)) {
            // Not attempting, could be an animated gif
            callback(file, false);
            // TODO: use https://github.com/antimatter15/whammy to convert gif to webm
            return false;
        }

        const image = document.createElement('img');
            
        image.onload = (imgEvt) => {
            let width = image.width;
            let height = image.height;
            let isTooLarge = false;

            if (width >= height && width > maxDimensions.width) {
                // width is the largest dimension, and it's too big.
                height *= maxDimensions.width / width;
                width = maxDimensions.width;
                isTooLarge = true;
            } else if (height > maxDimensions.height) {
                // either width wasn't over-size or height is the largest dimension
                // and the height is over-size
                width *= maxDimensions.height / height;
                height = maxDimensions.height;
                isTooLarge = true;
            }

            if (!isTooLarge) {
                // early exit; no need to resize
                callback(file, false);
                return;
            }

            const canvas = document.createElement('canvas');
            canvas.width = width;
            canvas.height = height;

            const ctx = canvas.getContext('2d');
            ctx.imageSmoothingEnabled = true;
            ctx.imageSmoothingQuality = 'high';
            ctx.drawImage(image, 0, 0, width, height);

            if (hasToBlobSupport) {
                canvas.toBlob((blob) => {
                    callback(blob, true);
                }, file.type);
            } else {
                const blob = ImageTools._toBlob(canvas, file.type);
                callback(blob, true);
            }
        };
        ImageTools._loadImage(image, file);

        return true;
    }

    static _toBlob(canvas, type) {
        const dataURI = canvas.toDataURL(type);
        const dataURIParts = dataURI.split(',');
        let byteString;
        if (dataURIParts[0].indexOf('base64') >= 0) {
            // Convert base64 to raw binary data held in a string:
            byteString = atob(dataURIParts[1]);
        } else {
            // Convert base64/URLEncoded data component to raw binary data:
            byteString = decodeURIComponent(dataURIParts[1]);
        }
        const arrayBuffer = new ArrayBuffer(byteString.length);
        const intArray = new Uint8Array(arrayBuffer);

        for (let i = 0; i < byteString.length; i += 1) {
            intArray[i] = byteString.charCodeAt(i);
        }

        const mimeString = dataURIParts[0].split(':')[1].split(';')[0];
        let blob = null;

        if (hasBlobConstructor) {
            blob = new Blob(
                [hasArrayBufferViewSupport ? intArray : arrayBuffer],
                { type: mimeString }
            );
        } else {
            blob = new Blob([arrayBuffer]);
        }

        return blob;
    }

    static _loadImage(image, file, callback) {
        if (typeof(URL) === 'undefined') {
            const reader = new FileReader();
            reader.onload = function(evt) {
                image.src = evt.target.result;
                if (callback) { callback(); }
            };
            reader.readAsDataURL(file);
        } else {
            image.src = URL.createObjectURL(file);
            if (callback) { callback(); }
        }
    };

    static isSupported() {
        return (
               (typeof(HTMLCanvasElement) !== 'undefined') 
            && hasBlobSupport
            && hasReaderSupport
        );
    }
}






//Based on MinifyJpeg
//http://elicon.blog57.fc2.com/blog-entry-206.html

var ExifRestorer = (function()
{
   
    var ExifRestorer = {};
     
    ExifRestorer.KEY_STR = "ABCDEFGHIJKLMNOP" +
                         "QRSTUVWXYZabcdef" +
                         "ghijklmnopqrstuv" +
                         "wxyz0123456789+/" +
                         "=";

    ExifRestorer.encode64 = function(input)
    {
        var output = "",
            chr1, chr2, chr3 = "",
            enc1, enc2, enc3, enc4 = "",
            i = 0;

        do {
            chr1 = input[i++];
            chr2 = input[i++];
            chr3 = input[i++];

            enc1 = chr1 >> 2;
            enc2 = ((chr1 & 3) << 4) | (chr2 >> 4);
            enc3 = ((chr2 & 15) << 2) | (chr3 >> 6);
            enc4 = chr3 & 63;

            if (isNaN(chr2)) {
               enc3 = enc4 = 64;
            } else if (isNaN(chr3)) {
               enc4 = 64;
            }

            output = output +
               this.KEY_STR.charAt(enc1) +
               this.KEY_STR.charAt(enc2) +
               this.KEY_STR.charAt(enc3) +
               this.KEY_STR.charAt(enc4);
            chr1 = chr2 = chr3 = "";
            enc1 = enc2 = enc3 = enc4 = "";
        } while (i < input.length);

        return output;
    };
    
    ExifRestorer.restore = function(origFileBase64, resizedFileBase64)
    {       
        if (!origFileBase64.match("data:image/jpeg;base64,"))
        {
            return resizedFileBase64;
        }       
        
        var rawImage = this.decode64(origFileBase64.replace("data:image/jpeg;base64,", ""));
        var segments = this.slice2Segments(rawImage);
                
        var image = this.exifManipulation(resizedFileBase64, segments);
        
        return this.encode64(image);
        
    };


    ExifRestorer.exifManipulation = function(resizedFileBase64, segments)
    {
            var exifArray = this.getExifArray(segments),
                newImageArray = this.insertExif(resizedFileBase64, exifArray),
                aBuffer = new Uint8Array(newImageArray);

            return aBuffer;
    };


    ExifRestorer.getExifArray = function(segments)
    {
            var seg;
            for (var x = 0; x < segments.length; x++)
            {
                seg = segments[x];
                if (seg[0] == 255 & seg[1] == 225) //(ff e1)
                {
                    return seg;
                }
            }
            return [];
    };


    ExifRestorer.insertExif = function(resizedFileBase64, exifArray)
    {
            var imageData = resizedFileBase64.replace("data:image/jpeg;base64,", ""),
                buf = this.decode64(imageData),
                separatePoint = buf.indexOf(255,3),
                mae = buf.slice(0, separatePoint),
                ato = buf.slice(separatePoint),
                array = mae;

            array = array.concat(exifArray);
            array = array.concat(ato);
           return array;
    };


    
    ExifRestorer.slice2Segments = function(rawImageArray)
    {
        var head = 0,
            segments = [];

        while (1)
        {
            if (rawImageArray[head] == 255 & rawImageArray[head + 1] == 218){break;}
            if (rawImageArray[head] == 255 & rawImageArray[head + 1] == 216)
            {
                head += 2;
            }
            else
            {
                var length = rawImageArray[head + 2] * 256 + rawImageArray[head + 3],
                    endPoint = head + length + 2,
                    seg = rawImageArray.slice(head, endPoint);
                segments.push(seg);
                head = endPoint;
            }
            if (head > rawImageArray.length){break;}
        }

        return segments;
    };


    
    ExifRestorer.decode64 = function(input) 
    {
        var output = "",
            chr1, chr2, chr3 = "",
            enc1, enc2, enc3, enc4 = "",
            i = 0,
            buf = [];

        // remove all characters that are not A-Z, a-z, 0-9, +, /, or =
        var base64test = /[^A-Za-z0-9\+\/\=]/g;
        if (base64test.exec(input)) {
            alert("There were invalid base64 characters in the input text.\n" +
                  "Valid base64 characters are A-Z, a-z, 0-9, '+', '/',and '='\n" +
                  "Expect errors in decoding.");
        }
        input = input.replace(/[^A-Za-z0-9\+\/\=]/g, "");

        do {
            enc1 = this.KEY_STR.indexOf(input.charAt(i++));
            enc2 = this.KEY_STR.indexOf(input.charAt(i++));
            enc3 = this.KEY_STR.indexOf(input.charAt(i++));
            enc4 = this.KEY_STR.indexOf(input.charAt(i++));

            chr1 = (enc1 << 2) | (enc2 >> 4);
            chr2 = ((enc2 & 15) << 4) | (enc3 >> 2);
            chr3 = ((enc3 & 3) << 6) | enc4;

            buf.push(chr1);

            if (enc3 != 64) {
               buf.push(chr2);
            }
            if (enc4 != 64) {
               buf.push(chr3);
            }

            chr1 = chr2 = chr3 = "";
            enc1 = enc2 = enc3 = enc4 = "";

        } while (i < input.length);

        return buf;
    };

    
    return ExifRestorer;
})();

