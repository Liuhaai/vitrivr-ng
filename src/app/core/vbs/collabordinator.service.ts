import {Inject, Injectable} from "@angular/core";
import {ConfigService} from "../basics/config.service";
import {filter} from "rxjs/operators";
import {webSocket, WebSocketSubject} from "rxjs/webSocket";
import {CollabordinatorMessage} from "../../shared/model/messages/collaboration/collabordinator-message.model";
import {BehaviorSubject} from "rxjs";
import {Tag} from "../selection/tag.model";
import {Config} from "../../shared/model/config/config.model";


/**
 * The {@link CollabordinatorService} is a {@link BehaviorSubject} that interacts with the Collabordinator web service via
 * WebSocket an publishes changes to subscribers of the {@link CollabordinatorService}.
 */
@Injectable()
export class CollabordinatorService extends BehaviorSubject<string[]> {

    /** The Vitrivr NG configuration as observable */
    private _webSocket: WebSocketSubject<CollabordinatorMessage>;

    /** The current instance of the loaded Config. */
    private _config: Config;

    /** The default Collabordinator tag. */
    public static readonly COLLABORDINATOR_TAG = new Tag("Submitted (Colab)", 0);

    /**
     * Constructor for the CollabordinatorService.
     *
     * @param _config ConfigService instance that serves the recent config.
     */
    constructor(@Inject(ConfigService) _config: ConfigService) {
        super([]);
        _config.pipe(
            filter(c => c.get<string>("vbs.collabordinator") != null)
        ).subscribe(c => {
            this._config = c;
            this.connect();
        });
    }

    /**
     * Sends a signal to the Collabordinator endpoint that tells it to add items to its list.
     *
     * @param id List of ids to add.
     */
    public add(...id: string[]) {
        if (this._webSocket) {
            this._webSocket.next({action: "ADD", key : "vitrivr", attribute: id})
        } else {
            console.log("Collabordinator service is currently not available.")
        }
    }

    /**
     * Sends a signal to the Collabordinator endpoint that tells it to remove items from its list.
     *
     * @param id List of ids to remove.
     */
    public remove(...id: string[]) {
        if (this._webSocket) {
            this._webSocket.next({action: "REMOVE", key : "vitrivr", attribute: id})
        } else {
            console.log("Collabordinator service is currently not available.")
        }
    }

    /**
     * Sends a signal to the Collabordinator endpoint that tells it to clear the list.
     */
    public clear() {
        if (this._webSocket) {
            this._webSocket.next({action: "CLEAR", key: "vitrivr", attribute: []})
        } else {
            console.log("Collabordinator service is currently not available.")
        }
    }

    /**
     * Connects to the Collabordinator service. If an existing connection is open, that connection will be closed.
     */
    public connect(): boolean {
        if (!this._config) return false;
        if (this._webSocket) {
            this._webSocket.complete();
            this.next([]);
        }
        this._webSocket = webSocket<CollabordinatorMessage>(this._config.get<string>("vbs.collabordinator"));
        this._webSocket.subscribe(
            v => this.synchronize(v),
            e => {
                console.log("Error occurred while communicating with Collabordinator web service");
                this.next([]);
            },
            () => {
                console.log("Connection to Collabordinator web service was closed.");
                this.next([]);
            }
        );
        return true;
    }

    /**
     * Returns true if the Collabordinator service is available and false otherwise.
     */
    public available(): boolean {
        return this._webSocket != null;
    }

    /**
     * Synchronizes the state of the local list according to the Collabordinator message received.
     *
     * @param msg Collabordinator message to process.
     */
    private synchronize(msg: CollabordinatorMessage) {
        let current = this.getValue().slice();
        switch (msg.action) {
            case "ADD":
                for (let v of msg.attribute) {
                    if (current.indexOf(v) == -1) current.push(v)
                }
                break;
            case "REMOVE":
                msg.attribute.forEach(v => {
                    let index = current.indexOf(v);
                    if (index > -1) current.splice(index,1)
                });

                break;
            case "CLEAR":
                current.length = 0;
                break;
        }
        this.next(current);
    }
}