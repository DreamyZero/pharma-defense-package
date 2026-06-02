"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.Neo4jModule = exports.NEO4J_DRIVER = void 0;
const common_1 = require("@nestjs/common");
const config_1 = require("@nestjs/config");
const neo4j_driver_1 = require("neo4j-driver");
const neo4j_service_1 = require("./neo4j.service");
exports.NEO4J_DRIVER = 'NEO4J_DRIVER';
let Neo4jModule = class Neo4jModule {
};
exports.Neo4jModule = Neo4jModule;
exports.Neo4jModule = Neo4jModule = __decorate([
    (0, common_1.Global)(),
    (0, common_1.Module)({
        imports: [config_1.ConfigModule],
        providers: [
            {
                provide: exports.NEO4J_DRIVER,
                inject: [config_1.ConfigService],
                useFactory: (config) => {
                    const uri = config.get('NEO4J_URI') ?? 'bolt://localhost:7687';
                    const user = config.get('NEO4J_USER') ?? 'neo4j';
                    const password = config.get('NEO4J_PASSWORD') ?? 'password';
                    return neo4j_driver_1.default.driver(uri, neo4j_driver_1.default.auth.basic(user, password));
                },
            },
            neo4j_service_1.Neo4jService,
        ],
        exports: [exports.NEO4J_DRIVER, neo4j_service_1.Neo4jService],
    })
], Neo4jModule);
//# sourceMappingURL=neo4j.module.js.map