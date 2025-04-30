"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __generator = (this && this.__generator) || function (thisArg, body) {
    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g = Object.create((typeof Iterator === "function" ? Iterator : Object).prototype);
    return g.next = verb(0), g["throw"] = verb(1), g["return"] = verb(2), typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
    function verb(n) { return function (v) { return step([n, v]); }; }
    function step(op) {
        if (f) throw new TypeError("Generator is already executing.");
        while (g && (g = 0, op[0] && (_ = 0)), _) try {
            if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done) return t;
            if (y = 0, t) op = [op[0] & 2, t.value];
            switch (op[0]) {
                case 0: case 1: t = op; break;
                case 4: _.label++; return { value: op[1], done: false };
                case 5: _.label++; y = op[1]; op = [0]; continue;
                case 7: op = _.ops.pop(); _.trys.pop(); continue;
                default:
                    if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
                    if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
                    if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
                    if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
                    if (t[2]) _.ops.pop();
                    _.trys.pop(); continue;
            }
            op = body.call(thisArg, _);
        } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }
        if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };
    }
};
Object.defineProperty(exports, "__esModule", { value: true });
// resetDatabase.ts
var mongodb_1 = require("mongodb");
var dotenv = require("dotenv");
// Load environment variables
dotenv.config();
// MongoDB connection URI from environment or use default
var uri = process.env.MONGODB_URI || "mongodb://localhost:27017/cms-mcp";
function resetDatabase() {
    return __awaiter(this, void 0, void 0, function () {
        var client, dbName, db, collections, _i, collections_1, collection, error_1;
        var _a;
        return __generator(this, function (_b) {
            switch (_b.label) {
                case 0:
                    console.log('Starting database reset process...');
                    console.log("Connecting to database: ".concat(uri));
                    client = new mongodb_1.MongoClient(uri);
                    _b.label = 1;
                case 1:
                    _b.trys.push([1, 10, 11, 13]);
                    // Connect to MongoDB
                    return [4 /*yield*/, client.connect()];
                case 2:
                    // Connect to MongoDB
                    _b.sent();
                    console.log('Connected to MongoDB successfully');
                    dbName = ((_a = uri.split('/').pop()) === null || _a === void 0 ? void 0 : _a.split('?')[0]) || 'cms-mcp';
                    db = client.db(dbName);
                    return [4 /*yield*/, db.listCollections().toArray()];
                case 3:
                    collections = _b.sent();
                    if (!(collections.length === 0)) return [3 /*break*/, 4];
                    console.log('No collections found in the database. Nothing to reset.');
                    return [3 /*break*/, 9];
                case 4:
                    console.log("Found ".concat(collections.length, " collections to drop:"));
                    _i = 0, collections_1 = collections;
                    _b.label = 5;
                case 5:
                    if (!(_i < collections_1.length)) return [3 /*break*/, 8];
                    collection = collections_1[_i];
                    console.log("Dropping collection: ".concat(collection.name, "..."));
                    return [4 /*yield*/, db.collection(collection.name).drop()];
                case 6:
                    _b.sent();
                    console.log("Collection ".concat(collection.name, " dropped successfully"));
                    _b.label = 7;
                case 7:
                    _i++;
                    return [3 /*break*/, 5];
                case 8:
                    console.log('All collections have been dropped successfully');
                    _b.label = 9;
                case 9:
                    console.log('Database reset completed successfully');
                    return [3 /*break*/, 13];
                case 10:
                    error_1 = _b.sent();
                    console.error('An error occurred during database reset:', error_1);
                    return [3 /*break*/, 13];
                case 11: 
                // Close the connection
                return [4 /*yield*/, client.close()];
                case 12:
                    // Close the connection
                    _b.sent();
                    console.log('Database connection closed');
                    return [7 /*endfinally*/];
                case 13: return [2 /*return*/];
            }
        });
    });
}
// Run the reset function
resetDatabase()
    .then(function () { return console.log('Database reset script completed'); })
    .catch(function (err) { return console.error('Database reset script failed:', err); });
