import { tabernacleController } from "tabernacle.infrastructure.di.bootstrap";
import type { PieceKey } from "tabernacle.domain.models.piece";

tabernacleController?.handlePieceClick(thisBot.tags.key as PieceKey);
