import {ChangeDetectorRef, Component, OnInit, OnDestroy, ChangeDetectionStrategy} from '@angular/core';
import {MatCheckboxChange, MatSliderChange} from "@angular/material";
import {QueryChange, QueryService} from "../../core/queries/query.service";
import {WeightedFeatureCategory} from "../../shared/model/results/weighted-feature-category.model";
import {MediaType} from "../../shared/model/media/media-type.model";
import {Observable} from "rxjs/Observable";

@Component({
    moduleId: module.id,
    selector: 'refinement',
    templateUrl: './refinement.component.html',
    styleUrls: ['./refinement.component.css'],
    changeDetection: ChangeDetectionStrategy.OnPush
})
/**
 * Component that can be used to refine an already executed query. Refinement options currently include
 * two actions:
 * - Filter results based on the MediaType
 * - Adjust weights per feature categories.
 *
 * The component allows the user to changes these settings and update the QueryService accordingly.
 */
export class RefinementComponent implements OnInit, OnDestroy {

    /** An observable for the current results. */
    private _features : Observable<WeightedFeatureCategory[]> = Observable.empty();

    /** An observable for the current results. */
    private _mediatypes : Observable<Map<MediaType,boolean>> = Observable.empty();

    /** Local reference to the subscription to the QueryService. */
    protected _queryServiceSubscription;

    /**
     * Constructor: Registers with the QueryService to be updated about changes
     * in the refinement.
     *
     * @param _cdr Reference to the ChangeDetector (Angular JS)
     * @param _queryService Reference to the QueryService instance.
     */
    constructor(private _cdr: ChangeDetectorRef, private _queryService : QueryService) {}

    /**
     * Lifecycle Hook (onInit): Subscribes to the QueryService observable.
     */
    public ngOnInit(): void {
        this._queryServiceSubscription = this._queryService.observable
            .filter(msg => {return ["STARTED", "CLEAR"].indexOf(msg) > -1})
            .subscribe((msg) => this.onQueryStartEnd(msg));
    }

    /**
     * Lifecycle Hook (onDestroy): Unsubscribes from the QueryService subscription.
     */
    public ngOnDestroy(): void {
        this._queryServiceSubscription.unsubscribe();
        this._queryServiceSubscription = null;
    }

    /**
     * Invoked whenever the QueryService reports that the refinement were changed. Causes the
     * refinement array to be updated and the view to be changed.
     */
    public onQueryStartEnd(msg: QueryChange) {
        if (msg == "STARTED") {
            this._features = this._queryService.results.featuresAsObservable;
            this._mediatypes = this._queryService.results.mediatypesAsObservable;
        } else if (msg == "CLEAR"){
            this._mediatypes = Observable.empty();
            this._features = Observable.empty();
        }
        this._cdr.markForCheck();
    }

    /**
     * Triggered whenever the filter selection changes. Reports the change to the
     * QueryService, which will update the filter settings accordingly.
     *
     * @param event
     */
    public onFilterChanged(event: MatCheckboxChange) {
        if (this._queryService.results) {
            this._queryService.results.toggleMediatype(<MediaType>event.source.name, event.source.checked)
        }
    }

    /**
     * Triggered whenever the value of one of the weight-sliders changes. Reports
     * the change to the QueryService, which will trigger a re-ranking of the results
     *
     * @param feature The feature that was changed.
     * @param event MatSliderChange event that contains the new value.
     */
    public onValueChanged(feature: WeightedFeatureCategory, event: MatSliderChange) {
        if (this._queryService.results) {
            feature.weight = event.value;
            this._queryService.results.rerank()
        }
    }

    /**
     * Getter for media types array.
     *
     * @return {MediaType[]}
     */
    get mediatypes(): Observable<Map<MediaType,boolean>> {
        return this._mediatypes
    }

    /**
     * Getter for refinement array.
     *
     * @return {WeightedFeatureCategory[]}
     */
    get features(): Observable<WeightedFeatureCategory[]> {
        return this._features;
    }
}